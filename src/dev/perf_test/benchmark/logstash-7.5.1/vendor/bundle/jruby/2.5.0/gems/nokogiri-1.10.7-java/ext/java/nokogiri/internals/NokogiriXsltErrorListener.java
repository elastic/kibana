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

import javax.xml.transform.ErrorListener;
import javax.xml.transform.TransformerException;

/**
 * Error Listener for XSLT transformer
 * 
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriXsltErrorListener implements ErrorListener {
    public enum ErrorType {
        SUCCESS,
        WARNING,
        ERROR,
        FATAL
    }

    private ErrorType type = ErrorType.SUCCESS;
    private String errorMessage = null;
    private Exception exception = null;

    public void warning(TransformerException ex) {
        type = ErrorType.WARNING;
        setError(ex);
    }

    public void error(TransformerException ex) {
       type = ErrorType.ERROR;
       setError(ex);
    }

    public void fatalError(TransformerException ex) {
        type = ErrorType.FATAL;
        setError(ex);
    }
    
    private void setError(TransformerException ex) {
        errorMessage = ex.getMessage();
        exception = ex;
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    public ErrorType getErrorType() {
        return type;
    }
    
    public Exception getException() {
        return exception;
    }

}
