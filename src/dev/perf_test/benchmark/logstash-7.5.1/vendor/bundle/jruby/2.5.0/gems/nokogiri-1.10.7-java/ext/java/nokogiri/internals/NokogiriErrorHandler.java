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

import java.util.ArrayList;
import java.util.List;

import org.apache.xerces.xni.parser.XMLErrorHandler;
import org.xml.sax.ErrorHandler;

/**
 * Super class of error handlers.
 * 
 * XMLErrorHandler is used by nokogiri.internals.HtmlDomParserContext since NekoHtml
 * uses this type of the error handler.
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public abstract class NokogiriErrorHandler implements ErrorHandler, XMLErrorHandler {
    protected final List<Exception> errors;
    protected boolean noerror;
    protected boolean nowarning;

    public NokogiriErrorHandler(boolean noerror, boolean nowarning) {
        this.errors = new ArrayList<Exception>(4);
        this.noerror = noerror;
        this.nowarning = nowarning;
    }

    List<Exception> getErrors() { return errors; }

    public void addError(Exception ex) { errors.add(ex); }

    protected boolean usesNekoHtml(String domain) {
        return "http://cyberneko.org/html".equals(domain);
    }

}
