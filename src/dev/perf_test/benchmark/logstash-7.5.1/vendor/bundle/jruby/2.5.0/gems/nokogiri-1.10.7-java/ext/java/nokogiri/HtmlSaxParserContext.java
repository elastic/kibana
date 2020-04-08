/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2011:
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

package nokogiri;

import static nokogiri.internals.NokogiriHelpers.rubyStringToString;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.IllegalCharsetNameException;
import java.nio.charset.UnsupportedCharsetException;
import java.util.EnumSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import nokogiri.internals.NokogiriHandler;

import org.apache.xerces.parsers.AbstractSAXParser;
import org.cyberneko.html.parsers.SAXParser;
import org.jruby.*;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.xml.sax.SAXException;

/**
 * Class for Nokogiri::HTML::SAX::ParserContext.
 *
 * @author serabe
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */

@JRubyClass(name="Nokogiri::HTML::SAX::ParserContext", parent="Nokogiri::XML::SAX::ParserContext")
public class HtmlSaxParserContext extends XmlSaxParserContext {

    public HtmlSaxParserContext(Ruby ruby, RubyClass rubyClass) {
        super(ruby, rubyClass);
    }
    
    @Override
    protected AbstractSAXParser createParser() throws SAXException {
        SAXParser parser = new SAXParser();

        try{
            parser.setProperty(
                "http://cyberneko.org/html/properties/names/elems", "lower");
            parser.setProperty(
                "http://cyberneko.org/html/properties/names/attrs", "lower");
            return parser;
        } catch(SAXException ex) {
            throw new SAXException(
                "Problem while creating HTML SAX Parser: " + ex.toString());
        }
    }

    @JRubyMethod(name="memory", meta=true)
    public static IRubyObject parse_memory(ThreadContext context,
                                           IRubyObject klazz,
                                           IRubyObject data,
                                           IRubyObject encoding) {
        HtmlSaxParserContext ctx = (HtmlSaxParserContext) NokogiriService.HTML_SAXPARSER_CONTEXT_ALLOCATOR.allocate(context.getRuntime(), (RubyClass)klazz);
        ctx.initialize(context.getRuntime());
        String javaEncoding = findEncoding(context, encoding);
        if (javaEncoding != null) {
            String input = applyEncoding(rubyStringToString(data), javaEncoding);
            ByteArrayInputStream istream = new ByteArrayInputStream(input.getBytes());
            ctx.setInputSource(istream);
            ctx.getInputSource().setEncoding(javaEncoding);
        }
        return ctx;
    }
    
    public enum EncodingType {
        NONE(0, "NONE"),
        UTF_8(1, "UTF-8"),
        UTF16LE(2, "UTF16LE"),
        UTF16BE(3, "UTF16BE"),
        UCS4LE(4, "UCS4LE"),
        UCS4BE(5, "UCS4BE"),
        EBCDIC(6, "EBCDIC"),
        UCS4_2143(7, "ICS4-2143"),
        UCS4_3412(8, "UCS4-3412"),
        UCS2(9, "UCS2"),
        ISO_8859_1(10, "ISO-8859-1"),
        ISO_8859_2(11, "ISO-8859-2"),
        ISO_8859_3(12, "ISO-8859-3"),
        ISO_8859_4(13, "ISO-8859-4"),
        ISO_8859_5(14, "ISO-8859-5"),
        ISO_8859_6(15, "ISO-8859-6"),
        ISO_8859_7(16, "ISO-8859-7"),
        ISO_8859_8(17, "ISO-8859-8"),
        ISO_8859_9(18, "ISO-8859-9"),
        ISO_2022_JP(19, "ISO-2022-JP"),
        SHIFT_JIS(20, "SHIFT-JIS"),
        EUC_JP(21, "EUC-JP"),
        ASCII(22, "ASCII");
        
        private final int value;
        private final String name;

        EncodingType(int value, String name) {
            this.value = value;
            this.name = name;
        }
        
        public int getValue() {
            return value;
        }
        
        public String toString() {
            return name;
        }
    }
    
    private static String findName(final int value) {
        for (EncodingType type : EncodingType.values()) {
            if (type.getValue() == value) return type.toString();
        }
        return null;
    }
    
    private static String findEncoding(ThreadContext context, IRubyObject encoding) {
        String rubyEncoding = null;
        if (encoding instanceof RubyString) {
            rubyEncoding = rubyStringToString(encoding);
        }
        else if (encoding instanceof RubyFixnum) {
            int value = RubyFixnum.fix2int((RubyFixnum) encoding);
            rubyEncoding = findName(value);
        }
        if (rubyEncoding == null) return null;
        try {
            return Charset.forName(rubyEncoding).displayName();
        }
        catch (UnsupportedCharsetException e) {
            throw context.getRuntime().newEncodingCompatibilityError(rubyEncoding + "is not supported");
        }
        catch (IllegalCharsetNameException e) {
            throw context.getRuntime().newInvalidEncoding(e.getMessage());
        }
    }

    private static final Pattern CHARSET_PATTERN = Pattern.compile("charset(()|\\s)=(()|\\s)([a-z]|-|_|\\d)+");

    private static String applyEncoding(String input, String enc) {
        String str = input.toLowerCase();
        int start_pos = 0;
        int end_pos = 0;
        if (input.contains("meta") && input.contains("charset")) {
            Matcher m = CHARSET_PATTERN.matcher(str);
            while (m.find()) {
                start_pos = m.start();
                end_pos = m.end();
            }
        }
        if (start_pos != end_pos) {
            String substr = input.substring(start_pos, end_pos);
            input = input.replace(substr, "charset=" + enc);
        }
        return input;
    }

    @JRubyMethod(name="file", meta=true)
    public static IRubyObject parse_file(ThreadContext context,
                                         IRubyObject klazz,
                                         IRubyObject data,
                                         IRubyObject encoding) {
        HtmlSaxParserContext ctx = (HtmlSaxParserContext) NokogiriService.HTML_SAXPARSER_CONTEXT_ALLOCATOR.allocate(context.getRuntime(), (RubyClass)klazz);
        ctx.initialize(context.getRuntime());
        ctx.setInputSourceFile(context, data);
        String javaEncoding = findEncoding(context, encoding);
        if (javaEncoding != null) {
            ctx.getInputSource().setEncoding(javaEncoding);
        }
        return ctx;
    }

    @JRubyMethod(name="io", meta=true)
    public static IRubyObject parse_io(ThreadContext context,
                                       IRubyObject klazz,
                                       IRubyObject data,
                                       IRubyObject encoding) {
        HtmlSaxParserContext ctx = (HtmlSaxParserContext) NokogiriService.HTML_SAXPARSER_CONTEXT_ALLOCATOR.allocate(context.getRuntime(), (RubyClass)klazz);
        ctx.initialize(context.getRuntime());
        ctx.setInputSource(context, data, context.getRuntime().getNil());
        String javaEncoding = findEncoding(context, encoding);
        if (javaEncoding != null) {
            ctx.getInputSource().setEncoding(javaEncoding);
        }
        return ctx;
    }

    /**
     * Create a new parser context that will read from a raw input stream.
     * Meant to be run in a separate thread by HtmlSaxPushParser.
     */
    static HtmlSaxParserContext parse_stream(final Ruby runtime, RubyClass klazz, InputStream stream) {
        HtmlSaxParserContext ctx = (HtmlSaxParserContext) NokogiriService.HTML_SAXPARSER_CONTEXT_ALLOCATOR.allocate(runtime, klazz);
        ctx.initialize(runtime);
        ctx.setInputSource(stream);
        return ctx;
    }

    @Override
    protected void preParse(final Ruby runtime, IRubyObject handlerRuby, NokogiriHandler handler) {
        // final String path = "Nokogiri::XML::FragmentHandler";
        // final String docFrag =
        //     "http://cyberneko.org/html/features/balance-tags/document-fragment";
        // RubyObjectAdapter adapter = JavaEmbedUtils.newObjectAdapter();
        // IRubyObject doc = adapter.getInstanceVariable(handlerRuby, "@document");
        // RubyModule mod = runtime.getClassFromPath(path);
        // try {
        //     if (doc != null && !doc.isNil() && adapter.isKindOf(doc, mod))
        //         parser.setFeature(docFrag, true);
        // } catch (Exception e) {
        //     // ignore
        // }
    }

}
