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

package nokogiri;

import static nokogiri.internals.NokogiriHelpers.stringOrNil;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyException;
import org.jruby.RubyString;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.xml.sax.SAXParseException;

/**
 * Class for Nokogiri::XML::SyntaxError
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::SyntaxError", parent="Nokogiri::SyntaxError")
public class XmlSyntaxError extends RubyException {

    private Exception exception;
    private boolean messageSet; // whether a custom error message was set

    public XmlSyntaxError(Ruby runtime, RubyClass klazz) {
        super(runtime, klazz);
    }

    public XmlSyntaxError(Ruby runtime, RubyClass rubyClass, Exception ex) {
        super(runtime, rubyClass, ex.getMessage());
        this.exception = ex;
    }

    public XmlSyntaxError(Ruby runtime, RubyClass rubyClass, String message, Exception ex) {
        super(runtime, rubyClass, message);
        this.exception = ex; this.messageSet = true;
    }

    public static XmlSyntaxError createXMLSyntaxError(final Ruby runtime) {
        RubyClass klazz = (RubyClass) runtime.getClassFromPath("Nokogiri::XML::SyntaxError");
        return new XmlSyntaxError(runtime, klazz);
    }

    public static XmlSyntaxError createXMLSyntaxError(final Ruby runtime, final Exception ex) {
        RubyClass klazz = (RubyClass) runtime.getClassFromPath("Nokogiri::XML::SyntaxError");
        return new XmlSyntaxError(runtime, klazz, ex);
    }

    public static XmlSyntaxError createHTMLSyntaxError(final Ruby runtime) {
        RubyClass klazz = (RubyClass) runtime.getClassFromPath("Nokogiri::HTML::SyntaxError");
        return new XmlSyntaxError(runtime, klazz);
    }

    public static RubyException createXMLXPathSyntaxError(final Ruby runtime, final String msg, final Exception ex) {
        RubyClass klazz = (RubyClass) runtime.getClassFromPath("Nokogiri::XML::XPath::SyntaxError");
        return new XmlSyntaxError(runtime, klazz, msg, ex);
    }

    public static XmlSyntaxError createWarning(Ruby runtime, SAXParseException e) {
        XmlSyntaxError xmlSyntaxError = createXMLSyntaxError(runtime);
        xmlSyntaxError.setException(runtime, e, 1);
        return xmlSyntaxError;
    }

    public static XmlSyntaxError createError(Ruby runtime, SAXParseException e) {
        XmlSyntaxError xmlSyntaxError = createXMLSyntaxError(runtime);
        xmlSyntaxError.setException(runtime, e, 2);
        return xmlSyntaxError;
    }

    public static XmlSyntaxError createFatalError(Ruby runtime, SAXParseException e) {
        XmlSyntaxError xmlSyntaxError = createXMLSyntaxError(runtime);
        xmlSyntaxError.setException(runtime, e, 3);
        return xmlSyntaxError;
    }

    public void setException(Exception exception) {
        this.exception = exception;
    }

    public void setException(Ruby runtime, SAXParseException exception, int level) {
        this.exception = exception;
        setInstanceVariable("@level", runtime.newFixnum(level));
        setInstanceVariable("@line", runtime.newFixnum(exception.getLineNumber()));
        setInstanceVariable("@column", runtime.newFixnum(exception.getColumnNumber()));
        setInstanceVariable("@file", stringOrNil(runtime, exception.getSystemId()));
    }

    // NOTE: special care - due JRuby 1.7.x
    
    @Override
    public IRubyObject to_s(ThreadContext context) { return to_s19(context); }

    @JRubyMethod(name = "to_s")
    public RubyString to_s19(ThreadContext context) {
        RubyString msg = msg(context.runtime);
        return msg != null ? msg : super.to_s(context).asString();
    }

    private RubyString msg(final Ruby runtime) {
        if (exception != null && exception.getMessage() != null) {
            if (messageSet) return null;
            return runtime.newString( exception.getMessage() );
        }
        return null;
    }

}
