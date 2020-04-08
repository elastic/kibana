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

import static nokogiri.internals.NokogiriHelpers.adjustSystemIdIfNecessary;
import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;

import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;

import javax.xml.XMLConstants;
import javax.xml.transform.Source;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;

import nokogiri.internals.IgnoreSchemaErrorsErrorHandler;
import nokogiri.internals.SchemaErrorHandler;
import nokogiri.internals.XmlDomParserContext;

import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.Visibility;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Document;
import org.w3c.dom.ls.LSInput;
import org.w3c.dom.ls.LSResourceResolver;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;

/**
 * Class for Nokogiri::XML::Schema
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::Schema")
public class XmlSchema extends RubyObject {
    private Validator validator;

    public XmlSchema(Ruby ruby, RubyClass klazz) {
        super(ruby, klazz);
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

    private Schema getSchema(Source source, String currentDir, String scriptFileName) throws SAXException {
        SchemaFactory schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        SchemaResourceResolver resourceResolver = new SchemaResourceResolver(currentDir, scriptFileName, null);
        schemaFactory.setResourceResolver(resourceResolver);
        schemaFactory.setErrorHandler(new IgnoreSchemaErrorsErrorHandler());
        return schemaFactory.newSchema(source);
    }

    private void setValidator(Validator validator) {
        this.validator = validator;
    }

    static XmlSchema createSchemaInstance(ThreadContext context, RubyClass klazz, Source source) {
        Ruby runtime = context.getRuntime();
        XmlSchema xmlSchema = (XmlSchema) NokogiriService.XML_SCHEMA_ALLOCATOR.allocate(runtime, klazz);
        xmlSchema.setInstanceVariable("@errors", runtime.newEmptyArray());

        try {
            Schema schema = xmlSchema.getSchema(source, context.getRuntime().getCurrentDirectory(), context.getRuntime().getInstanceConfig().getScriptFileName());
            xmlSchema.setValidator(schema.newValidator());
            return xmlSchema;
        } catch (SAXException ex) {
            throw context.getRuntime().newRuntimeError("Could not parse document: " + ex.getMessage());
        }
    }

    /*
     * call-seq:
     *  from_document(doc)
     *
     * Create a new Schema from the Nokogiri::XML::Document +doc+
     */
    @JRubyMethod(meta=true)
    public static IRubyObject from_document(ThreadContext context, IRubyObject klazz, IRubyObject document) {
        XmlDocument doc = ((XmlDocument) ((XmlNode) document).document(context));

        RubyArray errors = (RubyArray) doc.getInstanceVariable("@errors");
        if (!errors.isEmpty()) {
            throw new RaiseException((XmlSyntaxError) errors.first());
        }

        DOMSource source = new DOMSource(doc.getDocument());

        IRubyObject uri = doc.url(context);

        if (!uri.isNil()) {
            source.setSystemId(uri.convertToString().asJavaString());
        }

        return getSchema(context, (RubyClass)klazz, source);
    }

    private static IRubyObject getSchema(ThreadContext context, RubyClass klazz, Source source) {
        String moduleName = klazz.getName();
        if ("Nokogiri::XML::Schema".equals(moduleName)) {
            return XmlSchema.createSchemaInstance(context, klazz, source);
        } else if ("Nokogiri::XML::RelaxNG".equals(moduleName)) {
            return XmlRelaxng.createSchemaInstance(context, klazz, source);
        }
        return context.getRuntime().getNil();
    }

    @JRubyMethod(meta=true)
    public static IRubyObject read_memory(ThreadContext context, IRubyObject klazz, IRubyObject content) {
        String data = content.convertToString().asJavaString();
        return getSchema(context, (RubyClass) klazz, new StreamSource(new StringReader(data)));
    }

    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject validate_document(ThreadContext context, IRubyObject document) {
        return validate_document_or_file(context, (XmlDocument)document);
    }

    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject validate_file(ThreadContext context, IRubyObject file) {
        Ruby ruby = context.getRuntime();

        XmlDomParserContext ctx = new XmlDomParserContext(ruby, RubyFixnum.newFixnum(ruby, 1L));
        ctx.setInputSourceFile(context, file);
        XmlDocument xmlDocument = ctx.parse(context, getNokogiriClass(ruby, "Nokogiri::XML::Document"), ruby.getNil());
        return validate_document_or_file(context, xmlDocument);
    }

    IRubyObject validate_document_or_file(ThreadContext context, XmlDocument xmlDocument) {
        RubyArray errors = (RubyArray) this.getInstanceVariable("@errors");
        ErrorHandler errorHandler = new SchemaErrorHandler(context.runtime, errors);
        setErrorHandler(errorHandler);

        try {
            validate(xmlDocument.getDocument());
        }
        catch (SAXException ex) {
            XmlSyntaxError xmlSyntaxError = XmlSyntaxError.createXMLSyntaxError(context.runtime);
            xmlSyntaxError.setException(ex);
            errors.append(xmlSyntaxError);
        }
        catch (IOException ex) {
            throw context.runtime.newIOError(ex.getMessage());
        }

        return errors;
    }

    protected void setErrorHandler(ErrorHandler errorHandler) {
        validator.setErrorHandler(errorHandler);
    }

    protected void validate(Document document) throws SAXException, IOException {
        DOMSource docSource = new DOMSource(document);
        validator.validate(docSource);
    }

    private class SchemaResourceResolver implements LSResourceResolver {
        SchemaLSInput lsInput = new SchemaLSInput();
        String currentDir;
        String scriptFileName;
        //String defaultURI;

        SchemaResourceResolver(String currentDir, String scriptFileName, Object input) {
            this.currentDir = currentDir;
            this.scriptFileName = scriptFileName;
            if (input == null) return;
            if (input instanceof String) {
                lsInput.setStringData((String)input);
            } else if (input instanceof Reader) {
                lsInput.setCharacterStream((Reader)input);
            } else if (input instanceof InputStream) {
                lsInput.setByteStream((InputStream)input);
            }
        }

        @Override
        public LSInput resolveResource(String type, String namespaceURI, String publicId, String systemId, String baseURI) {
            String adjusted = adjustSystemIdIfNecessary(currentDir, scriptFileName, baseURI, systemId);
            lsInput.setPublicId(publicId);
            lsInput.setSystemId(adjusted != null? adjusted : systemId);
            lsInput.setBaseURI(baseURI);
            return lsInput;
        }
    }

    private class SchemaLSInput implements LSInput {
        protected String fPublicId;
        protected String fSystemId;
        protected String fBaseSystemId;
        protected InputStream fByteStream;
        protected Reader fCharStream;
        protected String fData;
        protected String fEncoding;
        protected boolean fCertifiedText = false;

        @Override
        public String getBaseURI() {
            return fBaseSystemId;
        }

        @Override
        public InputStream getByteStream() {
            return fByteStream;
        }

        @Override
        public boolean getCertifiedText() {
            return fCertifiedText;
        }

        @Override
        public Reader getCharacterStream() {
            return fCharStream;
        }

        @Override
        public String getEncoding() {
            return fEncoding;
        }

        @Override
        public String getPublicId() {
            return fPublicId;
        }

        @Override
        public String getStringData() {
            return fData;
        }

        @Override
        public String getSystemId() {
            return fSystemId;
        }

        @Override
        public void setBaseURI(String baseURI) {
            fBaseSystemId = baseURI;
        }

        @Override
        public void setByteStream(InputStream byteStream) {
            fByteStream = byteStream;
        }

        @Override
        public void setCertifiedText(boolean certified) {
            fCertifiedText = certified;
        }

        @Override
        public void setCharacterStream(Reader charStream) {
            fCharStream = charStream;
        }

        @Override
        public void setEncoding(String encoding) {
            fEncoding = encoding;
        }

        @Override
        public void setPublicId(String pubId) {
            fPublicId = pubId;
        }

        @Override
        public void setStringData(String stringData) {
            fData = stringData;
        }

        @Override
        public void setSystemId(String sysId) {
            fSystemId = sysId;
        }

    }
}
