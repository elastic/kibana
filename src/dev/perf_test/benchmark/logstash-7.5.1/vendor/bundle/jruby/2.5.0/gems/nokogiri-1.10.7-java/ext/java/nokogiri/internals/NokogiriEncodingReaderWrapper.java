package nokogiri.internals;

import java.io.InputStream;

import org.jruby.Ruby;
import org.jruby.RubyObject;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.Helpers;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.ByteList;

/**
 * This class wraps the EncodingReader which act like a rewinding input stream,
 * it tries to read the first 1K of data to detect the encoding, but save
 * this data in a buffer for the subsequent read. Unfortunately, the EncodingReader
 * will behave as expected only if encoding was detected, otherwise, the read data
 * won't be stored and EncodingReader will fallback to read directory from the io stream.
 * this is kind of lame, since we need to have similar logic in both layers. The alternative
 * is to implement the encoding detection similar to the way C-Nokogiri does it; it starts
 * parsing assuming encoding is unknown and if encoding is detected it will throw an exception
 * causing parsing to stop, in which case we have to intercept the exception and set the encoding.
 * Also in this case we don't have to restart the parsing since html/document.rb does that for us.
 *
 * @author John Shahid <jvshahid@gmail.com>
 *
 */
public class NokogiriEncodingReaderWrapper extends InputStream {
  private final ThreadContext context;
  private final IRubyObject   encodingReader;
  private final Ruby          ruby;
  private IRubyObject         detectedEncoding;
  private final byte[]        firstChunk       = new byte[1024];
  private int                 firstChunkOff    = 0;
  private int                 firstChunkLength = 0;

  public NokogiriEncodingReaderWrapper(ThreadContext context, RubyObject encodingReader) {
    this.context = context;
    this.encodingReader = encodingReader;
    this.ruby = context.getRuntime();

    if (!Helpers.invoke(context, encodingReader, "respond_to?", ruby.newSymbol("read")).isTrue()
        || encodingReader.getInstanceVariable("@io") == null) {
      throw ruby.newArgumentError("Argument doesn't respond to read or doesn't have instance variable @io");
    }
  }

  public boolean detectEncoding() {
    try {
      firstChunkLength = read(firstChunk);
    } catch (RaiseException e) {
      detectedEncoding = e.getException().getInstanceVariable("@found_encoding");
      return true;
    }
    detectedEncoding = context.nil;
    return false;
  }

  public IRubyObject getEncoding() {
    return detectedEncoding;
  }

  @Override
  public int read(byte b[]) {
    return read(b, 0, b.length);
  }

  @Override
  public int read(byte b[], int off, int len) {
    if (b == null) {
      throw new NullPointerException();
    } else if (off < 0 || len < 0 || len > b.length - off) {
      throw new IndexOutOfBoundsException();
    } else if (len == 0) {
      return 0;
    }

    int copyLength = Math.min(firstChunkLength - firstChunkOff, len);
    if (copyLength > 0) {
      System.arraycopy(firstChunk, firstChunkOff, b, off, copyLength);
      len -= copyLength;
      firstChunkOff += copyLength;
    }

    if (len <= 0)
      return copyLength;

    IRubyObject returnValue = encodingReader.callMethod(context, "read", ruby.newFixnum(len));
    if (returnValue.isNil())
      return -1;

    ByteList bytes = returnValue.asString().getByteList();
    int length = bytes.length();
    System.arraycopy(bytes.unsafeBytes(), bytes.getBegin(), b, off + copyLength, length);
    return length + copyLength;
  }

  @Override
  public int read() {
    byte[] bytes = new byte[1];
    int count = read(bytes, 0, 1);
    if (count < 1)
      return count;
    return bytes[0];
  }

}
