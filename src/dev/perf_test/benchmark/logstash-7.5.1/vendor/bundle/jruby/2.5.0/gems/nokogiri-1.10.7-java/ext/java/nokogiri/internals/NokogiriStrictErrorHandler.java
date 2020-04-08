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

import org.apache.xerces.xni.parser.XMLParseException;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

/**
 * Strict error handler. Even though strict is specified, Nokogiri allows to go further
 * when NOERROR or/both NOWARNING is/are true.
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriStrictErrorHandler extends NokogiriErrorHandler {
    public NokogiriStrictErrorHandler(boolean noerror, boolean nowarning) {
        super(noerror, nowarning);
    }

    public void warning(SAXParseException spex) throws SAXException {
        if (!nowarning) throw spex;
        else errors.add(spex);
    }

    public void error(SAXParseException spex) throws SAXException {
        if (!noerror) throw spex;
        else errors.add(spex);
    }

    public void fatalError(SAXParseException spex) throws SAXException {
        throw spex;
    }

    public void error(String domain, String key, XMLParseException e) throws XMLParseException {
        if (!noerror) throw e;
        else errors.add(e);
    }

    public void fatalError(String domain, String key, XMLParseException e) throws XMLParseException {
        throw e;
    }

    public void warning(String domain, String key, XMLParseException e) throws XMLParseException {
        if (!nowarning) throw e;
        if (!usesNekoHtml(domain)) errors.add(e);
    }
}
