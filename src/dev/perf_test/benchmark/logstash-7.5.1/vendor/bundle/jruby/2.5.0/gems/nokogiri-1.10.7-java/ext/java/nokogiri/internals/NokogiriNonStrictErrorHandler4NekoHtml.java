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
 * Non-strict error handler for NekoHtml.
 * 
 * NekoHtml adds too many warnings, which makes later processing hard. For example,
 * Nokogiri wants to know whether number of errors have been increased or not to judge 
 * availability of creating NodeSet from a given fragment. When the fragment nodes 
 * are to be created from HTML document, which means NekoHtml is used, always errors
 * increases. As a result, even though the given fragment is correct HTML, NodeSet
 * base on the given fragment won't be created. This is why all warnings are eliminated.
 * 
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriNonStrictErrorHandler4NekoHtml extends NokogiriErrorHandler {
    
    public NokogiriNonStrictErrorHandler4NekoHtml(boolean nowarning) {
        super(false, nowarning);
    }
    
    public NokogiriNonStrictErrorHandler4NekoHtml(boolean noerror, boolean nowarning) {
        super(noerror, nowarning);
    }

    public void warning(SAXParseException ex) throws SAXException {
        //noop. NekoHtml adds too many warnings.
    }

    public void error(SAXParseException ex) throws SAXException {
        errors.add(ex);
    }

    public void fatalError(SAXParseException ex) throws SAXException {
        errors.add(ex);
    }

    /**
     * Implementation of org.apache.xerces.xni.parser.XMLErrorHandler. This method
     * is invoked during parsing fired by HtmlDomParserContext and is a NekoHtml requirement.
     * 
     * @param domain The domain of the error. The domain can be any string but is 
     *               suggested to be a valid URI. The domain can be used to conveniently
     *               specify a web site location of the relevant specification or 
     *               document pertaining to this warning.
     * @param key The error key. This key can be any string and is implementation
     *            dependent.
     * @param e Exception.
     */
    public void error(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

    /**
     * Implementation of org.apache.xerces.xni.parser.XMLErrorHandler. This method
     * is invoked during parsing fired by HtmlDomParserContext and is a NekoHtml requirement.
     * 
     * @param domain The domain of the fatal error. The domain can be any string but is 
     *               suggested to be a valid URI. The domain can be used to conveniently
     *               specify a web site location of the relevant specification or 
     *               document pertaining to this warning.
     * @param key The fatal error key. This key can be any string and is implementation
     *            dependent.
     * @param e Exception.
     */
    public void fatalError(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

    /**
     * Implementation of org.apache.xerces.xni.parser.XMLErrorHandler. This method
     * is invoked during parsing fired by HtmlDomParserContext and is a NekoHtml requirement.
     * 
     * @param domain The domain of the warning. The domain can be any string but is 
     *               suggested to be a valid URI. The domain can be used to conveniently
     *               specify a web site location of the relevant specification or 
     *               document pertaining to this warning.
     * @param key The warning key. This key can be any string and is implementation
     *            dependent.
     * @param e Exception.
     */
    public void warning(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

}
