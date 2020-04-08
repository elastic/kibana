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

import static org.jruby.runtime.Helpers.invoke;

import java.io.IOException;
import java.io.InputStream;

import nokogiri.internals.NokogiriHandler;
import nokogiri.internals.NokogiriHelpers;
import nokogiri.internals.ParserContext;
import nokogiri.internals.XmlSaxParser;

import org.apache.xerces.parsers.AbstractSAXParser;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.RubyModule;
import org.jruby.RubyObjectAdapter;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.exceptions.RaiseException;
import org.jruby.javasupport.JavaEmbedUtils;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.xml.sax.ContentHandler;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXNotRecognizedException;
import org.xml.sax.SAXNotSupportedException;
import org.xml.sax.SAXParseException;

/**
 * Base class for the SAX parsers.
 *
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::SAX::ParserContext")
public class XmlSaxParserContext extends ParserContext {

    protected static final String FEATURE_NAMESPACES =
        "http://xml.org/sax/features/namespaces";
    protected static final String FEATURE_NAMESPACE_PREFIXES =
        "http://xml.org/sax/features/namespace-prefixes";
    protected static final String FEATURE_LOAD_EXTERNAL_DTD =
        "http://apache.org/xml/features/nonvalidating/load-external-dtd";
    protected static final String FEATURE_CONTINUE_AFTER_FATAL_ERROR =
        "http://apache.org/xml/features/continue-after-fatal-error";

    protected AbstractSAXParser parser;

    protected NokogiriHandler handler;
    private boolean replaceEntities = true;
    private boolean recovery = false;

    public XmlSaxParserContext(final Ruby ruby, RubyClass rubyClass) {
        super(ruby, rubyClass);
    }
        
    protected void initialize(Ruby runtime) {
        try {
            parser = createParser();
        }
        catch (SAXException se) {
            throw RaiseException.createNativeRaiseException(runtime, se);
        }
    }

    /**
     * Create and return a copy of this object.
     *
     * @return a clone of this object
     */
    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    protected AbstractSAXParser createParser() throws SAXException {
        XmlSaxParser parser = new XmlSaxParser();
        parser.setFeature(FEATURE_NAMESPACE_PREFIXES, true);
        parser.setFeature(FEATURE_LOAD_EXTERNAL_DTD, false);
        return parser;
    }

    /**
     * Create a new parser context that will parse the string
     * <code>data</code>.
     */
    @JRubyMethod(name="memory", meta=true)
    public static IRubyObject parse_memory(ThreadContext context,
                                           IRubyObject klazz,
                                           IRubyObject data) {
        final Ruby runtime = context.runtime;
        XmlSaxParserContext ctx = newInstance(runtime, (RubyClass) klazz);
        ctx.initialize(runtime);
        ctx.setInputSource(context, data, runtime.getNil());
        return ctx;
    }

    /**
     * Create a new parser context that will read from the file
     * <code>data</code> and parse.
     */
    @JRubyMethod(name="file", meta=true)
    public static IRubyObject parse_file(ThreadContext context,
                                         IRubyObject klazz,
                                         IRubyObject data) {
        final Ruby runtime = context.runtime;
        XmlSaxParserContext ctx = newInstance(runtime, (RubyClass) klazz);
        ctx.initialize(context.getRuntime());
        ctx.setInputSourceFile(context, data);
        return ctx;
    }

    /**
     * Create a new parser context that will read from the IO or
     * StringIO <code>data</code> and parse.
     *
     * TODO: Currently ignores encoding <code>enc</code>.
     */
    @JRubyMethod(name="io", meta=true)
    public static IRubyObject parse_io(ThreadContext context,
                                       IRubyObject klazz,
                                       IRubyObject data,
                                       IRubyObject enc) {
        //int encoding = (int)enc.convertToInteger().getLongValue();
        final Ruby runtime = context.runtime;
        XmlSaxParserContext ctx = newInstance(runtime, (RubyClass) klazz);
        ctx.initialize(runtime);
        ctx.setInputSource(context, data, runtime.getNil());
        return ctx;
    }

    /**
     * Create a new parser context that will read from a raw input stream.
     * Meant to be run in a separate thread by XmlSaxPushParser.
     */
    static XmlSaxParserContext parse_stream(final Ruby runtime, RubyClass klazz, InputStream stream) {
        XmlSaxParserContext ctx = newInstance(runtime, klazz);
        ctx.initialize(runtime);
        ctx.setInputSource(stream);
        return ctx;
    }

    private static XmlSaxParserContext newInstance(final Ruby runtime, final RubyClass klazz) {
        return (XmlSaxParserContext) NokogiriService.XML_SAXPARSER_CONTEXT_ALLOCATOR.allocate(runtime, klazz);
    }

    /**
     * Set a property of the underlying parser.
     */
    protected void setProperty(String key, Object val)
        throws SAXNotRecognizedException, SAXNotSupportedException {
        parser.setProperty(key, val);
    }

    protected void setContentHandler(ContentHandler handler) {
        parser.setContentHandler(handler);
    }

    protected void setErrorHandler(ErrorHandler handler) {
        parser.setErrorHandler(handler);
    }

    public final NokogiriHandler getNokogiriHandler() { return handler; }

    /**
     * Perform any initialization prior to parsing with the handler
     * <code>handlerRuby</code>. Convenience hook for subclasses.
     */
    protected void preParse(Ruby runtime, IRubyObject handlerRuby, NokogiriHandler handler) {
        ((XmlSaxParser) parser).setXmlDeclHandler(handler);
        if (recovery) {
            try {
                parser.setFeature(FEATURE_CONTINUE_AFTER_FATAL_ERROR, true);
            }
            catch (Exception e) {
                throw RaiseException.createNativeRaiseException(runtime, e);
            }
        }
    }

    protected void postParse(Ruby runtime, IRubyObject handlerRuby, NokogiriHandler handler) {
        // noop
    }

    protected void do_parse() throws SAXException, IOException {
        parser.parse(getInputSource());
    }

    @JRubyMethod
    public IRubyObject parse_with(ThreadContext context, IRubyObject handlerRuby) {
        final Ruby runtime = context.getRuntime();

        if(!invoke(context, handlerRuby, "respond_to?", runtime.newSymbol("document")).isTrue()) {
            throw runtime.newArgumentError("argument must respond_to document");
        }

        NokogiriHandler handler = this.handler = new NokogiriHandler(runtime, handlerRuby);
        preParse(runtime, handlerRuby, handler);

        setContentHandler(handler);
        setErrorHandler(handler);

        try{
            setProperty("http://xml.org/sax/properties/lexical-handler", handler);
        }
        catch (Exception ex) {
            throw runtime.newRuntimeError("Problem while creating XML SAX Parser: " + ex.toString());
        }

        try{
            try {
                do_parse();
            }
            catch (SAXParseException ex) {
                // A bad document (<foo><bar></foo>) should call the
                // error handler instead of raising a SAX exception.

                // However, an EMPTY document should raise a RuntimeError.
                // This is a bit kludgy, but AFAIK SAX doesn't distinguish
                // between empty and bad whereas Nokogiri does.
                String message = ex.getMessage();
                if (message != null && message.contains("Premature end of file.") && stringDataSize < 1) {
                    throw runtime.newRuntimeError("couldn't parse document: " + message);
                }
                handler.error(ex);
            }
        }
        catch (SAXException ex) {
            throw RaiseException.createNativeRaiseException(runtime, ex);
        }
        catch (IOException ex) {
            throw runtime.newIOErrorFromException(ex);
        }

        postParse(runtime, handlerRuby, handler);

        //maybeTrimLeadingAndTrailingWhitespace(context, handlerRuby);

        return runtime.getNil();
    }

    /**
     * Can take a boolean assignment.
     *
     * @param context
     * @param value
     * @return
     */
    @JRubyMethod(name = "replace_entities=")
    public IRubyObject set_replace_entities(ThreadContext context, IRubyObject value) {
        replaceEntities = value.isTrue();
        return this;
    }

    @JRubyMethod(name="replace_entities")
    public IRubyObject get_replace_entities(ThreadContext context) {
        return context.runtime.newBoolean(replaceEntities);
    }

    /**
     * Can take a boolean assignment.
     *
     * @param context
     * @param value
     * @return
     */
    @JRubyMethod(name = "recovery=")
    public IRubyObject set_recovery(ThreadContext context, IRubyObject value) {
        recovery = value.isTrue();
        return this;
    }

    @JRubyMethod(name="recovery")
    public IRubyObject get_recovery(ThreadContext context) {
        return context.runtime.newBoolean(recovery);
    }

    /**
     * If the handler's document is a FragmentHandler, attempt to trim
     * leading and trailing whitespace.
     *
     * This is a bit hackish and depends heavily on the internals of
     * FragmentHandler.
     */
    protected void maybeTrimLeadingAndTrailingWhitespace(ThreadContext context, IRubyObject parser) {
        RubyObjectAdapter adapter = JavaEmbedUtils.newObjectAdapter();
        RubyModule mod = context.getRuntime().getClassFromPath("Nokogiri::XML::FragmentHandler");

        IRubyObject handler = adapter.getInstanceVariable(parser, "@document");
        if (handler == null || handler.isNil() || !adapter.isKindOf(handler, mod))
            return;
        IRubyObject stack = adapter.getInstanceVariable(handler, "@stack");
        if (stack == null || stack.isNil())
            return;
        // doc is finally a DocumentFragment whose nodes we can check
        IRubyObject doc = adapter.callMethod(stack, "first");
        if (doc == null || doc.isNil())
            return;

        IRubyObject children;

        for (;;) {
            children = adapter.callMethod(doc, "children");
            IRubyObject first = adapter.callMethod(children, "first");
            if (NokogiriHelpers.isBlank(first)) adapter.callMethod(first, "unlink");
            else break;
        }

        for (;;) {
            children = adapter.callMethod(doc, "children");
            IRubyObject last = adapter.callMethod(children, "last");
            if (NokogiriHelpers.isBlank(last)) adapter.callMethod(last, "unlink");
            else break;
        }

        // While we have a document, normalize it.
        ((XmlNode) doc).normalize();
    }

    @JRubyMethod(name="column")
    public IRubyObject column(ThreadContext context) {
        final Integer number = handler.getColumn();
        if (number == null) return context.getRuntime().getNil();
        return RubyFixnum.newFixnum(context.getRuntime(), number.longValue());
    }

    @JRubyMethod(name="line")
    public IRubyObject line(ThreadContext context) {
        final Integer number = handler.getLine();
        if (number == null) return context.getRuntime().getNil();
        return RubyFixnum.newFixnum(context.getRuntime(), number.longValue());
    }

}
