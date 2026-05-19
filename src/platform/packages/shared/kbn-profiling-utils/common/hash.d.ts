/**
 * - fnv1a64 computes a 64-bit hash of a byte array using the FNV-1a hash function [1].
 * Due to the lack of a native uint64 in JavaScript, we operate on 64-bit values using an array
 * of 4 uint16s instead. This method follows Knuth's Algorithm M in section 4.3.1 [2] using a
 * modified multiword multiplication implementation described in [3]. The modifications include:
 * - rewrite default algorithm for the special case m = n = 4
 * - unroll loops
 * - simplify expressions
 * - create pre-computed lookup table for serialization to hexadecimal
 * 1. https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 * 2. Knuth, Donald E. The Art of Computer Programming, Volume 2, Third Edition: Seminumerical
 *      Algorithms. Addison-Wesley, 1998.
 * 3. Warren, Henry S. Hacker's Delight. Upper Saddle River, NJ: Addison-Wesley, 2013.
 * @param bytes Uint8Array
 * @returns string
 */
export declare function fnv1a64(bytes: Uint8Array): string;
