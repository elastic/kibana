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

import static nokogiri.internals.NokogiriHelpers.rubyStringToString;
import static org.jruby.runtime.Helpers.invoke;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.UnsupportedCharsetException;
import java.util.concurrent.Callable;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyIO;
import org.jruby.RubyObject;
import org.jruby.RubyString;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.ByteList;
import org.jruby.util.TypeConverter;
import org.xml.sax.InputSource;

/**
 * Base class for the various parser contexts.  Handles converting
 * Ruby objects to InputSource objects.
 *
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
public abstract class ParserContext extends RubyObject {
    protected InputSource source = null;
    protected IRubyObject detected_encoding = null;
    protected int stringDataSize = -1;

    public ParserContext(Ruby runtime) {
        // default to class 'Object' because this class isn't exposed to Ruby
        super(runtime, runtime.getObject());
    }

    public ParserContext(Ruby runtime, RubyClass klass) {
        super(runtime, klass);
    }

    protected InputSource getInputSource() {
        return source;
    }

    /**
     * Set the InputSource from <code>url</code> or <code>data</code>,
     * which may be an IO object, a String, or a StringIO.
     */
    public void setInputSource(ThreadContext context, IRubyObject data, IRubyObject url) {
        source = new InputSource();

        Ruby ruby = context.getRuntime();

        ParserContext.setUrl(context, source, url);

        // if setEncoding returned true, then the stream is set
        // to the EncodingReaderInputStream
        if (setEncoding(context, data))
          return;

        RubyString stringData = null;
        if (invoke(context, data, "respond_to?", ruby.newSymbol("to_io")).isTrue()) {
            RubyIO io =
                (RubyIO) TypeConverter.convertToType(data,
                                                     ruby.getIO(),
                                                     "to_io");
            // use unclosedable input stream to fix #495
            source.setByteStream(new UncloseableInputStream(io.getInStream()));

        } else if (invoke(context, data, "respond_to?", ruby.newSymbol("read")).isTrue()) {
            stringData = invoke(context, data, "read").convertToString();

        } else if (invoke(context, data, "respond_to?", ruby.newSymbol("string")).isTrue()) {
            stringData = invoke(context, data, "string").convertToString();

        } else if (data instanceof RubyString) {
            stringData = (RubyString) data;

        } else {
            throw ruby.newArgumentError("must be kind_of String or respond to :to_io, :read, or :string");
        }

        if (stringData != null) {
            String encName = null;
            if (stringData.encoding(context) != null) {
                encName = stringData.encoding(context).toString();
            }
            Charset charset = null;
            if (encName != null) {
                try {
                    charset = Charset.forName(encName);
                } catch (UnsupportedCharsetException e) {
                    // do nothing;
                }
            }
            ByteList bytes = stringData.getByteList();
            if (charset != null) {
                StringReader reader = new StringReader(new String(bytes.unsafeBytes(), bytes.begin(), bytes.length(), charset));
                source.setCharacterStream(reader);
                source.setEncoding(charset.name());
            } else {
                stringDataSize = bytes.length() - bytes.begin();
                ByteArrayInputStream stream = new ByteArrayInputStream(bytes.unsafeBytes(), bytes.begin(), bytes.length());
                source.setByteStream(stream);
            }
        }
    }

    public static void setUrl(ThreadContext context, InputSource source, IRubyObject url) {
        String path = rubyStringToString(url);
        // Dir.chdir might be called at some point before this.
        if (path != null) {
          try {
            URI uri = URI.create(path);
            source.setSystemId(uri.toURL().toString());
          } catch (Exception ex) {
            // fallback to the old behavior
            File file = new File(path);
            if (file.isAbsolute()) {
              source.setSystemId(path);
            } else {
              String pwd = context.getRuntime().getCurrentDirectory();
              String absolutePath;
              try {
                absolutePath = new File(pwd, path).getCanonicalPath();
              } catch (IOException e) {
                absolutePath = new File(pwd, path).getAbsolutePath();
              }
              source.setSystemId(absolutePath);
            }
          }
        }
    }

    private boolean setEncoding(ThreadContext context, IRubyObject data) {
        if (data.getType().respondsTo("detect_encoding")) {
            // in case of EncodingReader is used
            // since EncodingReader won't respond to :to_io
            NokogiriEncodingReaderWrapper reader = new NokogiriEncodingReaderWrapper(context, (RubyObject) data);
            source.setByteStream(reader);
            // data is EnocodingReader
            if(reader.detectEncoding()) {
              detected_encoding = reader.getEncoding();
              source.setEncoding(detected_encoding.asJavaString());
            }
            return true;
        }
        return false;
    }
    
    protected void setEncoding(String encoding) {
    	source.setEncoding(encoding);
    }

    /**
     * Set the InputSource to read from <code>file</code>, a String filename.
     */
    public void setInputSourceFile(ThreadContext context, IRubyObject file) {
        source = new InputSource();
        ParserContext.setUrl(context, source, file);
    }

    /**
     * Set the InputSource from <code>stream</code>.
     */
    public void setInputSource(InputStream stream) {
        source = new InputSource(stream);
    }

    /**
     * Wrap Nokogiri parser options in a utility class.  This is
     * read-only.
     */
    public static class Options {
        protected static final long STRICT = 0;
        protected static final long RECOVER = 1;
        protected static final long NOENT = 2;
        protected static final long DTDLOAD = 4;
        protected static final long DTDATTR = 8;
        protected static final long DTDVALID = 16;
        protected static final long NOERROR = 32;
        protected static final long NOWARNING = 64;
        protected static final long PEDANTIC = 128;
        protected static final long NOBLANKS = 256;
        protected static final long SAX1 = 512;
        protected static final long XINCLUDE = 1024;
        protected static final long NONET = 2048;
        protected static final long NODICT = 4096;
        protected static final long NSCLEAN = 8192;
        protected static final long NOCDATA = 16384;
        protected static final long NOXINCNODE = 32768;

        public final boolean strict;
        public final boolean recover;
        public final boolean noEnt;
        public final boolean dtdLoad;
        public final boolean dtdAttr;
        public final boolean dtdValid;
        public final boolean noError;
        public final boolean noWarning;
        public final boolean pedantic;
        public final boolean noBlanks;
        public final boolean sax1;
        public final boolean xInclude;
        public final boolean noNet;
        public final boolean noDict;
        public final boolean nsClean;
        public final boolean noCdata;
        public final boolean noXIncNode;

        protected static boolean test(long options, long mask) {
            return ((options & mask) == mask);
        }

        public Options(long options) {
            strict = ((options & RECOVER) == STRICT);
            recover = test(options, RECOVER);
            noEnt = test(options, NOENT);
            dtdLoad = test(options, DTDLOAD);
            dtdAttr = test(options, DTDATTR);
            dtdValid = test(options, DTDVALID);
            noError = test(options, NOERROR);
            noWarning = test(options, NOWARNING);
            pedantic = test(options, PEDANTIC);
            noBlanks = test(options, NOBLANKS);
            sax1 = test(options, SAX1);
            xInclude = test(options, XINCLUDE);
            noNet = test(options, NONET);
            noDict = test(options, NODICT);
            nsClean = test(options, NSCLEAN);
            noCdata = test(options, NOCDATA);
            noXIncNode = test(options, NOXINCNODE);
        }
    }

    /*
    public static class NokogiriXInlcudeEntityResolver implements org.xml.sax.EntityResolver {
        InputSource source;
        public NokogiriXInlcudeEntityResolver(InputSource source) {
            this.source = source;
        }

        @Override
        public InputSource resolveEntity(String publicId, String systemId)
                throws SAXException, IOException {
            if (systemId != null) source.setSystemId(systemId);
            if (publicId != null) source.setPublicId(publicId);
            return source;
        }
    } */

    public static abstract class ParserTask<T extends ParserContext> implements Callable<T> {

        protected final ThreadContext context; // TODO does not seem like a good idea!?
        protected final IRubyObject handler;
        protected final T parser;

        protected ParserTask(ThreadContext context, IRubyObject handler, T parser) {
            this.context = context;
            this.handler = handler;
            this.parser = parser;
        }

    }

}
