/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// ported from https://github.com/spalger/sha.js/blob/6557630d508873e262e94bff70c50bdd797c1df7/sha256.js
// and https://github.com/spalger/sha.js/blob/6557630d508873e262e94bff70c50bdd797c1df7/hash.js

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 * Copyright (c) 2013-2014 sha.js contributors
 *
 * Permission is hereby granted, free of charge,
 * to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to
 * deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom
 * the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2,
];

const W = new Array(64);

export class Sha256 {
  constructor() {
    this.init();

    this._w = W; // new Array(64)

    const blockSize = 64;
    const finalSize = 56;
    this._block = Buffer.alloc(blockSize);
    this._finalSize = finalSize;
    this._blockSize = blockSize;
    this._len = 0;
    this._s = 0;
  }

  init() {
    this._a = 0x6a09e667;
    this._b = 0xbb67ae85;
    this._c = 0x3c6ef372;
    this._d = 0xa54ff53a;
    this._e = 0x510e527f;
    this._f = 0x9b05688c;
    this._g = 0x1f83d9ab;
    this._h = 0x5be0cd19;

    return this;
  }

  update(data, enc) {
    if (typeof data === 'string') {
      enc = enc || 'utf8';
      data = Buffer.from(data, enc);
    }

    const l = this._len += data.length;
    let s = this._s || 0;
    let f = 0;
    const buffer = this._block;

    while (s < l) {
      const t = Math.min(data.length, f + this._blockSize - (s % this._blockSize));
      const ch = (t - f);

      for (let i = 0; i < ch; i++) {
        buffer[(s % this._blockSize) + i] = data[i + f];
      }

      s += ch;
      f += ch;

      if ((s % this._blockSize) === 0) {
        this._update(buffer);
      }
    }
    this._s = s;

    return this;
  }

  digest(enc) {
    // Suppose the length of the message M, in bits, is l
    const l = this._len * 8;

    // Append the bit 1 to the end of the message
    this._block[this._len % this._blockSize] = 0x80;

    // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
    this._block.fill(0, this._len % this._blockSize + 1);

    if (l % (this._blockSize * 8) >= this._finalSize * 8) {
      this._update(this._block);
      this._block.fill(0);
    }

    // to this append the block which is equal to the number l written in binary
    // TODO: handle case where l is > Math.pow(2, 29)
    this._block.writeInt32BE(l, this._blockSize - 4);

    const hash = this._update(this._block) || this._hash();

    return enc ? hash.toString(enc) : hash;
  }

  _update(M) {
    const W = this._w;

    let a = this._a | 0;
    let b = this._b | 0;
    let c = this._c | 0;
    let d = this._d | 0;
    let e = this._e | 0;
    let f = this._f | 0;
    let g = this._g | 0;
    let h = this._h | 0;

    let i;
    for (i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4);
    for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0;

    for (let j = 0; j < 64; ++j) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0;
      const T2 = (sigma0(a) + maj(a, b, c)) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + T1) | 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) | 0;
    }

    this._a = (a + this._a) | 0;
    this._b = (b + this._b) | 0;
    this._c = (c + this._c) | 0;
    this._d = (d + this._d) | 0;
    this._e = (e + this._e) | 0;
    this._f = (f + this._f) | 0;
    this._g = (g + this._g) | 0;
    this._h = (h + this._h) | 0;
  }

  _hash() {
    const H = Buffer.alloc(32);

    H.writeInt32BE(this._a, 0);
    H.writeInt32BE(this._b, 4);
    H.writeInt32BE(this._c, 8);
    H.writeInt32BE(this._d, 12);
    H.writeInt32BE(this._e, 16);
    H.writeInt32BE(this._f, 20);
    H.writeInt32BE(this._g, 24);
    H.writeInt32BE(this._h, 28);

    return H;
  }
}

function ch(x, y, z) {
  return z ^ (x & (y ^ z));
}

function maj(x, y, z) {
  return (x & y) | (z & (x | y));
}

function sigma0(x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10);
}

function sigma1(x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7);
}

function gamma0(x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3);
}

function gamma1(x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10);
}
