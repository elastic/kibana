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

import static nokogiri.internals.NokogiriHelpers.CACHED_NODE;
import static nokogiri.internals.NokogiriHelpers.getCachedNodeOrCreate;
import static nokogiri.internals.NokogiriHelpers.getLocalNameForNamespace;
import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.stringOrNil;
import nokogiri.internals.NokogiriHelpers;
import nokogiri.internals.SaveContextVisitor;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyObject;
import org.jruby.RubyString;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Node;

/**
 * Class for Nokogiri::XML::Namespace
 * 
 * @author serabe
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::Namespace")
public class XmlNamespace extends RubyObject {
    private Attr attr;
    private IRubyObject prefix;
    private IRubyObject href;
    private String prefixString;
    private String hrefString;

    public XmlNamespace(Ruby ruby, RubyClass klazz) {
        super(ruby, klazz);
    }
    
    public Node getNode() {
        return attr;
    }
    
    public String getPrefix() {
        return prefixString;
    }
    
    public String getHref() {
        return hrefString;
    }
    
    void deleteHref() {
        hrefString = "http://www.w3.org/XML/1998/namespace";
        href = NokogiriHelpers.stringOrNil(getRuntime(), hrefString);
        attr.getOwnerElement().removeAttributeNode(attr);
    }

    public void init(Attr attr, IRubyObject prefix, IRubyObject href, IRubyObject xmlDocument) {
        init(attr, prefix, href, (String) prefix.toJava(String.class), (String) href.toJava(String.class), xmlDocument);
    }
    
    public void init(Attr attr, IRubyObject prefix, IRubyObject href, String prefixString, String hrefString, IRubyObject xmlDocument) {
        this.attr = attr;
        this.prefix = prefix;
        this.href = href;
        this.prefixString = prefixString;
        this.hrefString = hrefString;
        setInstanceVariable("@document", xmlDocument);
    }
    
    public static XmlNamespace createFromAttr(Ruby runtime, Attr attr) {
        String prefixValue = getLocalNameForNamespace(attr.getName());
        IRubyObject prefix_value;
        if (prefixValue == null) {
            prefix_value = runtime.getNil();
            prefixValue = "";
        } else {
            prefix_value = RubyString.newString(runtime, prefixValue);
        }
        String hrefValue = attr.getValue();
        IRubyObject href_value = RubyString.newString(runtime, hrefValue);
        // check namespace cache
        XmlDocument xmlDocument = (XmlDocument)getCachedNodeOrCreate(runtime, attr.getOwnerDocument());
        xmlDocument.initializeNamespaceCacheIfNecessary();
        XmlNamespace xmlNamespace = xmlDocument.getNamespaceCache().get(prefixValue, hrefValue);
        if (xmlNamespace != null) return xmlNamespace;
        
        // creating XmlNamespace instance
        XmlNamespace namespace =
            (XmlNamespace) NokogiriService.XML_NAMESPACE_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Namespace")); 
        namespace.init(attr, prefix_value, href_value, prefixValue, hrefValue, xmlDocument);
        
        // updateing namespace cache
        xmlDocument.getNamespaceCache().put(namespace, attr.getOwnerElement());
        return namespace;
    }
    
    public static XmlNamespace createFromPrefixAndHref(Node owner, IRubyObject prefix, IRubyObject href) {
        String prefixValue = prefix.isNil() ? "" : (String) prefix.toJava(String.class);
        String hrefValue = (String) href.toJava(String.class);
        Ruby runtime = prefix.getRuntime();
        Document document = owner.getOwnerDocument();
        // check namespace cache
        XmlDocument xmlDocument = (XmlDocument)getCachedNodeOrCreate(runtime, document);
        xmlDocument.initializeNamespaceCacheIfNecessary();
        XmlNamespace xmlNamespace = xmlDocument.getNamespaceCache().get(prefixValue, hrefValue);
        if (xmlNamespace != null) return xmlNamespace;

        // creating XmlNamespace instance
        XmlNamespace namespace =
            (XmlNamespace) NokogiriService.XML_NAMESPACE_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Namespace"));
        String attrName = "xmlns";
        if (!"".equals(prefixValue)) {
            attrName = attrName + ":" + prefixValue;
        }
        Attr attrNode = document.createAttribute(attrName);
        attrNode.setNodeValue(hrefValue);

        // initialize XmlNamespace object
        namespace.init(attrNode, prefix, href, prefixValue, hrefValue, xmlDocument);
        
        // updating namespace cache
        xmlDocument.getNamespaceCache().put(namespace, owner);
        return namespace;
    }
    
    // owner should be an Attr node
    public static XmlNamespace createDefaultNamespace(Ruby runtime, Node owner) {
        String prefixValue = owner.getPrefix();
        String hrefValue = owner.getNamespaceURI();
        Document document = owner.getOwnerDocument();
        // check namespace cache
        XmlDocument xmlDocument = (XmlDocument)getCachedNodeOrCreate(runtime, document);
        XmlNamespace xmlNamespace = xmlDocument.getNamespaceCache().get(prefixValue, hrefValue);
        if (xmlNamespace != null) return xmlNamespace;

        // creating XmlNamespace instance
        XmlNamespace namespace =
            (XmlNamespace) NokogiriService.XML_NAMESPACE_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Namespace"));

        IRubyObject prefix = stringOrNil(runtime, prefixValue);
        IRubyObject href = stringOrNil(runtime, hrefValue);
        // initialize XmlNamespace object
        namespace.init((Attr)owner, prefix, href, prefixValue, hrefValue, xmlDocument);
        
        // updating namespace cache
        xmlDocument.getNamespaceCache().put(namespace, owner);
        return namespace;
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

    public boolean isEmpty() {
        return prefix.isNil() && href.isNil();
    }

    @JRubyMethod
    public IRubyObject href(ThreadContext context) {
        return href;
    }

    @JRubyMethod
    public IRubyObject prefix(ThreadContext context) {
        return prefix;
    }
    
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        String string = " " + prefix + "=\"" + href + "\"";
        visitor.enter(string);
        visitor.leave(string);
        // is below better?
        //visitor.enter(attr);
        //visitor.leave(attr);
    }
}
