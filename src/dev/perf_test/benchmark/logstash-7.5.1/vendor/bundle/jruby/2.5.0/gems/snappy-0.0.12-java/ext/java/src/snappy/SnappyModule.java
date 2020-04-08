package snappy;

import java.io.IOException;

import org.jruby.RubyString;
import org.jruby.anno.JRubyModule;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.ByteList;

import org.xerial.snappy.Snappy;


@JRubyModule(name = "Snappy")
public class SnappyModule {
  @JRubyMethod(module = true, name = {"deflate", "compress", "dump"})
  public static IRubyObject deflate(ThreadContext context, IRubyObject self, IRubyObject str) throws IOException {
    ByteList input = str.convertToString().getByteList();
    byte[] compressed = new byte[Snappy.maxCompressedLength(input.length())];
    int compressedLength = Snappy.compress(input.unsafeBytes(), input.begin(), input.length(), compressed, 0);
    return RubyString.newStringNoCopy(context.runtime, compressed, 0, compressedLength);
  }

  @JRubyMethod(module = true, name = {"inflate", "uncompress", "load"})
  public static IRubyObject inflate(ThreadContext context, IRubyObject self, IRubyObject str) throws IOException {
    ByteList input = str.convertToString().getByteList();
    byte[] uncompressed = new byte[Snappy.uncompressedLength(input.unsafeBytes(), input.begin(), input.length())];
    int uncompressedLength = Snappy.uncompress(input.unsafeBytes(), input.begin(), input.length(), uncompressed, 0);
    return RubyString.newStringNoCopy(context.runtime, uncompressed, 0, uncompressedLength);
  }
}