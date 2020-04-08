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

package nokogiri.internals;

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import nokogiri.NokogiriService;
import nokogiri.XmlSyntaxError;

import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

/**
 * Error handler for Relax and W3C XML Schema.
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class SchemaErrorHandler implements ErrorHandler {

    private final Ruby runtime;
    final RubyArray errors;

    public SchemaErrorHandler(Ruby ruby, RubyArray array) {
        this.runtime = ruby;
        this.errors = array;
    }

    public void warning(SAXParseException ex) throws SAXException {
        errors.append( XmlSyntaxError.createWarning(runtime, ex) );
    }

    public void error(SAXParseException ex) throws SAXException {
        errors.append( XmlSyntaxError.createError(runtime, ex) );
    }

    public void fatalError(SAXParseException ex) throws SAXException {
        throw ex;
    }

}
