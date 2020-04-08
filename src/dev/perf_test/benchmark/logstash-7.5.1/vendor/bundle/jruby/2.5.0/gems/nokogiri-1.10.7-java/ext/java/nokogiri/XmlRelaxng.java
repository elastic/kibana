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

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;

import javax.xml.transform.Source;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

import org.iso_relax.verifier.Schema;
import org.iso_relax.verifier.Verifier;
import org.iso_relax.verifier.VerifierConfigurationException;
import org.iso_relax.verifier.VerifierFactory;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyClass;
import org.jruby.runtime.ThreadContext;
import org.w3c.dom.Document;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;

/**
 * Class for Nokogiri::XML::RelaxNG
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::RelaxNG", parent="Nokogiri::XML::Schema")
public class XmlRelaxng extends XmlSchema {
    private Verifier verifier;

    public XmlRelaxng(Ruby ruby, RubyClass klazz) {
        super(ruby, klazz);
    }
    
    private void setVerifier(Verifier verifier) {
        this.verifier = verifier;
    }
    
    static XmlSchema createSchemaInstance(ThreadContext context, RubyClass klazz, Source source) {
        Ruby runtime = context.getRuntime();
        XmlRelaxng xmlRelaxng = (XmlRelaxng) NokogiriService.XML_RELAXNG_ALLOCATOR.allocate(runtime, klazz);
        xmlRelaxng.setInstanceVariable("@errors", runtime.newEmptyArray());
        
        try {
            Schema schema = xmlRelaxng.getSchema(source, context);
            xmlRelaxng.setVerifier(schema.newVerifier());
            return xmlRelaxng;
        } catch (VerifierConfigurationException ex) {
            throw context.getRuntime().newRuntimeError("Could not parse document: " + ex.getMessage());
        }
    }

    private Schema getSchema(Source source, ThreadContext context) {
        InputStream is;
        VerifierFactory factory = new com.thaiopensource.relaxng.jarv.VerifierFactoryImpl();
        if (source instanceof StreamSource) {
            StreamSource ss = (StreamSource)source;
            is = ss.getInputStream();
        } else { //if (this.source instanceof DOMSource)
            DOMSource ds = (DOMSource)source;
            StringWriter xmlAsWriter = new StringWriter();
            StreamResult result = new StreamResult(xmlAsWriter);
            try {
                TransformerFactory.newInstance().newTransformer().transform(ds, result);
            } catch (TransformerConfigurationException ex) {
                throw context.getRuntime()
                    .newRuntimeError("Could not parse document: "+ex.getMessage());
            } catch (TransformerException ex) {
                throw context.getRuntime()
                    .newRuntimeError("Could not parse document: "+ex.getMessage());
            }
            try {
                is = new ByteArrayInputStream(xmlAsWriter.toString().getBytes("UTF-8"));
            } catch (UnsupportedEncodingException ex) {
                throw context.getRuntime()
                    .newRuntimeError("Could not parse document: "+ex.getMessage());
            }
        }

        try {
            return factory.compileSchema(is);
        } catch (VerifierConfigurationException ex) {
            throw context.getRuntime()
                .newRuntimeError("Could not parse document: "+ex.getMessage());
        } catch (SAXException ex) {
            throw context.getRuntime()
                .newRuntimeError("Could not parse document: "+ex.getMessage());
        } catch (IOException ex) {
            throw context.getRuntime().newIOError(ex.getMessage());
        }
    }
    
    @Override
    protected void setErrorHandler(ErrorHandler errorHandler) {
        verifier.setErrorHandler(errorHandler);
    }
    
    @Override
    protected void validate(Document document) throws SAXException, IOException {
        verifier.verify(document);
    }
}
