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
 * Error Handler for XML document when recover is true (default).
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriNonStrictErrorHandler extends NokogiriErrorHandler{
    public NokogiriNonStrictErrorHandler(boolean noerror, boolean nowarning) {
        super(noerror, nowarning);
    }

    public void warning(SAXParseException ex) throws SAXException {
        errors.add(ex);
    }

    public void error(SAXParseException ex) throws SAXException {
        errors.add(ex);
    }

    public void fatalError(SAXParseException ex) throws SAXException {
        // fix #837
        // Xerces won't skip the reference entity (and other invalid) constructs
        // found in the prolog, instead it will keep calling this method and we'll
        // keep inserting the error in the document errors array until we run
        // out of memory
        errors.add(ex);
        String message = ex.getMessage();

        // The problem with Xerces is that some errors will cause the
        // parser not to advance the reader and it will keep reporting
        // the same error over and over, which will cause the parser
        // to enter an infinite loop unless we throw the exception.
        if (message != null && isFatal(message)) {
          throw ex;
        }
    }

    public void error(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

    public void fatalError(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

    public void warning(String domain, String key, XMLParseException e) {
        errors.add(e);
    }

    /*
     * Determine whether this is a fatal error that should cause
     * the parsing to stop, or an error that can be ignored.
     */
    private static boolean isFatal(String msg) {
        String msgLowerCase = msg.toLowerCase();
        return
          msgLowerCase.contains("in prolog") ||
          msgLowerCase.contains("limit") ||
          msgLowerCase.contains("preceding the root element must be well-formed") ||
          msgLowerCase.contains("following the root element must be well-formed");
    }
}
