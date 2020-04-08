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

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.isNamespace;
import static nokogiri.internals.NokogiriHelpers.stringOrNil;
import nokogiri.HtmlDocument;
import nokogiri.NokogiriService;
import nokogiri.XmlDocument;

import org.apache.xerces.xni.Augmentations;
import org.apache.xerces.xni.QName;
import org.apache.xerces.xni.XMLAttributes;
import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLDocumentFilter;
import org.apache.xerces.xni.parser.XMLParserConfiguration;
import org.cyberneko.html.HTMLConfiguration;
import org.cyberneko.html.filters.DefaultFilter;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Document;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Parser for HtmlDocument. This class actually parses HtmlDocument using NekoHtml.
 * 
 * @author sergio
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class HtmlDomParserContext extends XmlDomParserContext {

	public HtmlDomParserContext(Ruby runtime, IRubyObject options) {
        super(runtime, options);
    }
    
    public HtmlDomParserContext(Ruby runtime, IRubyObject encoding, IRubyObject options) {
        super(runtime, encoding, options);
    }

    @Override
    protected void initErrorHandler() {
        if (options.strict) {
            errorHandler = new NokogiriStrictErrorHandler(options.noError, options.noWarning);
        } else {
            errorHandler = new NokogiriNonStrictErrorHandler4NekoHtml(options.noError, options.noWarning);
        }
    }

    @Override
    protected void initParser(Ruby runtime) {
        XMLParserConfiguration config = new HTMLConfiguration();
        //XMLDocumentFilter removeNSAttrsFilter = new RemoveNSAttrsFilter();
        XMLDocumentFilter elementValidityCheckFilter = new ElementValidityCheckFilter(errorHandler);
        //XMLDocumentFilter[] filters = { removeNSAttrsFilter,  elementValidityCheckFilter};
        XMLDocumentFilter[] filters = { elementValidityCheckFilter};

        config.setErrorHandler(this.errorHandler);

        parser = new NokogiriDomParser(config);

        // see http://nekohtml.sourceforge.net/settings.html for details
        setProperty("http://cyberneko.org/html/properties/default-encoding", java_encoding);
        setProperty("http://cyberneko.org/html/properties/names/elems", "lower");
        setProperty("http://cyberneko.org/html/properties/names/attrs", "lower");
        setProperty("http://cyberneko.org/html/properties/filters", filters);
        setFeature("http://cyberneko.org/html/features/report-errors", true);
        setFeature("http://xml.org/sax/features/namespaces", false);
    }
    
    @Override
    public void setEncoding(String encoding) {
		super.setEncoding(encoding);
    }

    /**
     * Enable NekoHTML feature for balancing tags in a document fragment.
     * 
     * This method is used in XmlNode#in_context method.
     */
    public void enableDocumentFragment() {
        setFeature("http://cyberneko.org/html/features/balance-tags/document-fragment", true);
    }

    @Override
    protected XmlDocument getNewEmptyDocument(ThreadContext context) {
        IRubyObject[] args = IRubyObject.NULL_ARRAY;
        return (XmlDocument) XmlDocument.rbNew(context, getNokogiriClass(context.getRuntime(), "Nokogiri::HTML::Document"), args);
    }

    @Override
    protected XmlDocument wrapDocument(ThreadContext context, RubyClass klazz, Document document) {
        HtmlDocument htmlDocument = (HtmlDocument) NokogiriService.HTML_DOCUMENT_ALLOCATOR.allocate(context.getRuntime(), klazz);
        htmlDocument.setDocumentNode(context, document);
        if (ruby_encoding.isNil()) {
            // ruby_encoding might have detected by HtmlDocument::EncodingReader
            if (detected_encoding != null && !detected_encoding.isNil()) {
                ruby_encoding = detected_encoding;
            } else {
                // no encoding given & no encoding detected, then try to get it
                String charset = tryGetCharsetFromHtml5MetaTag(document);
                ruby_encoding = stringOrNil(context.getRuntime(), charset);
            }
        }
        htmlDocument.setEncoding(ruby_encoding);
        htmlDocument.setParsedEncoding(java_encoding);
        return htmlDocument;
    }
    
    // NekoHtml doesn't understand HTML5 meta tag format. This fails to detect charset
    // from an HTML5 style meta tag. Luckily, the meta tag and charset exists in DOM tree
    // so, this method attempts to find the charset.
    private static String tryGetCharsetFromHtml5MetaTag(Document document) {
        if (!"html".equalsIgnoreCase(document.getDocumentElement().getNodeName())) return null;
        NodeList list = document.getDocumentElement().getChildNodes(); Node item;
        for (int i = 0; i < list.getLength(); i++) {
            if ("head".equalsIgnoreCase((item = list.item(i)).getNodeName())) {
                NodeList headers = item.getChildNodes();
                for (int j = 0; j < headers.getLength(); j++) {
                    if ("meta".equalsIgnoreCase((item = headers.item(j)).getNodeName())) {
                        NamedNodeMap nodeMap = item.getAttributes();
                        for (int k = 0; k < nodeMap.getLength(); k++) {
                            if ("charset".equalsIgnoreCase((item = nodeMap.item(k)).getNodeName())) {
                                return item.getNodeValue();
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Filter to strip out attributes that pertain to XML namespaces.
     */
    public static class RemoveNSAttrsFilter extends DefaultFilter {
        @Override
        public void startElement(QName element, XMLAttributes attrs,
                                 Augmentations augs) throws XNIException {
            int i;
            for (i = 0; i < attrs.getLength(); ++i) {
                if (isNamespace(attrs.getQName(i))) {
                    attrs.removeAttributeAt(i);
                    --i;
                }
            }

            element.uri = null;
            super.startElement(element, attrs, augs);
        }
    }
    
    public static class ElementValidityCheckFilter extends DefaultFilter {
        private NokogiriErrorHandler errorHandler;
        
        private ElementValidityCheckFilter(NokogiriErrorHandler errorHandler) {
            this.errorHandler = errorHandler;
        }
        
        // element names from xhtml1-strict.dtd
        private static String[][] element_names = {
                {"a", "abbr", "acronym", "address", "area"},
                {"b", "base", "basefont", "bdo", "big", "blockquote", "body", "br", "button"},
                {"caption", "cite", "code", "col", "colgroup"},
                {"dd", "del", "dfn", "div", "dl", "dt"},
                {"em"},
                {"fieldset", "font", "form", "frame", "frameset"},
                {}, // g
                {"h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "html"},
                {"i", "iframe", "img", "input", "ins"},
                {}, // j
                {"kbd"},
                {"label", "legend", "li", "link"},
                {"map", "meta"},
                {"noframes", "noscript"},
                {"object", "ol", "optgroup", "option"},
                {"p", "param", "pre"},
                {"q"},
                {}, // r
                {"s", "samp", "script", "select", "small", "span", "strike", "strong", "style", "sub", "sup"},
                {"table", "tbody", "td", "textarea", "tfoot", "th", "thead", "title", "tr", "tt"},
                {"u", "ul"},
                {"var"},
                {}, // w
                {}, // x
                {}, // y
                {}  // z
        };
        
        private static boolean isValid(final String name) {
            int index = name.charAt(0) - 97;
            if (index >= element_names.length) return false;
            String[] elementNames = element_names[index];
            for (int i=0; i<elementNames.length; i++) {
                if (name.equals(elementNames[i])) {
                    return true;
                }
            }
            return false;
        }
        
        @Override
        public void startElement(QName name, XMLAttributes attrs, Augmentations augs) throws XNIException {
            if (!isValid(name.rawname)) {
                errorHandler.addError(new Exception("Tag " + name.rawname + " invalid"));
            }
            super.startElement(name, attrs, augs);
        }
    }
}
