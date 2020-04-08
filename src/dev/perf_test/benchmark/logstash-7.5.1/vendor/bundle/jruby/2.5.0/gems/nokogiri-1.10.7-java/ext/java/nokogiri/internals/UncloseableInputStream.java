/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2012:
 *
 * * {Aaron Patterson}[http://tenderlovemaking.com]
 * * {Mike Dalessio}[http://mike.daless.io]
 * * {Charles Nutter}[http://blog.headius.com]
 * * {Sergio Arbeo}[http://www.serabe.com]
 * * {Patrick Mahoney}[http://polycrystal.org]
 * * {Yoko Harada}[http://yokolet.blogspot.com]
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package nokogiri.internals;

import java.io.IOException;
import java.io.InputStream;

/**
 * Delegates all the methods to another InputStream except the
 * close() method, which is ignored. This is used to fix #495.
 *
 * @author John Shahid <jvshahid@gmail.com>
 */
public class UncloseableInputStream extends InputStream {
  private final InputStream delegate;

  /**
   * Create a new uncloseable stream.
   *
   * @param delegate The InputStream to which all methods (except close)
   * will be delegated.
   */
  public UncloseableInputStream(InputStream delegate) {
    this.delegate = delegate;
  }

  @Override
  public int read() throws IOException {
    return delegate.read();
  }

  @Override
  public int read(byte []b) throws IOException {
    return delegate.read(b);
  }

  @Override
  public int read(byte []b, int offset, int len) throws IOException {
    return delegate.read(b, offset, len);
  }

  @Override
  public long skip(long n) throws IOException {
    return delegate.skip(n);
  }

  @Override
  public int available() throws IOException {
    return delegate.available();
  }

  @Override
  public void close() {
    // don't forward this to the InputStream we're delegating from
    // we don't want the InputStream of the RubyIO to be closed
  }

  @Override
  public void mark(int readlimit) {
    delegate.mark(readlimit);
  }

  @Override
  public void reset() throws IOException {
    delegate.reset();
  }

  @Override
  public boolean markSupported() {
    return delegate.markSupported();
  }
}
