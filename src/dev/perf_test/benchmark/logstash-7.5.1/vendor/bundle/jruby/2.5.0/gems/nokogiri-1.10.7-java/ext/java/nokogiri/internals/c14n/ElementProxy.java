/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package nokogiri.internals.c14n;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.Text;

/**
 * This is the base class to all Objects which have a direct 1:1 mapping to an
 * Element in a particular namespace.
 */
public abstract class ElementProxy {

    /** Field constructionElement */
    protected Element constructionElement = null;

    /** Field baseURI */
    protected String baseURI = null;

    /** Field doc */
    protected Document doc = null;
    
    /** Field prefixMappings */
    private static Map<String, String> prefixMappings = new ConcurrentHashMap<String, String>();

    /**
     * Constructor ElementProxy
     *
     */
    public ElementProxy() {	   
    }

    /**
     * Constructor ElementProxy
     *
     * @param doc
     */
    public ElementProxy(Document doc) {
        if (doc == null) {
            throw new RuntimeException("Document is null");
        }

        this.doc = doc;
        this.constructionElement = 
            createElementForFamilyLocal(this.doc, this.getBaseNamespace(), this.getBaseLocalName());      
    }
    
    /**
     * Constructor ElementProxy
     *
     * @param element
     * @param BaseURI
     * @throws XMLSecurityException
     */
    public ElementProxy(Element element, String BaseURI) throws CanonicalizationException {
        if (element == null) {
            throw new CanonicalizationException("ElementProxy.nullElement");
        }

        //if (System.getProperty("nokogiri.c14.debug") == "on") {
        //    System.out.println("setElement(\"" + element.getTagName() + "\", \"" + BaseURI + "\")");
        //}

        this.doc = element.getOwnerDocument();
        this.constructionElement = element;
        this.baseURI = BaseURI;

        this.guaranteeThatElementInCorrectSpace();
    }
    
    /**
     * Returns the namespace of the Elements of the sub-class.
     *
     * @return the namespace of the Elements of the sub-class.
     */
    public abstract String getBaseNamespace();

    /**
     * Returns the localname of the Elements of the sub-class.
     *
     * @return the localname of the Elements of the sub-class.
     */
    public abstract String getBaseLocalName();
    
    
    protected Element createElementForFamilyLocal(
        Document doc, String namespace, String localName
    ) {	   	  
        Element result;
        if (namespace == null) {
            result = doc.createElementNS(null, localName);
        } else {
            String baseName = this.getBaseNamespace();
            String prefix = ElementProxy.getDefaultPrefix(baseName);
            if ((prefix == null) || (prefix.length() == 0)) {
                result = doc.createElementNS(namespace, localName);
                result.setAttributeNS(Constants.NamespaceSpecNS, "xmlns", namespace);
            } else {
                result = doc.createElementNS(namespace, prefix + ":" + localName);
                result.setAttributeNS(Constants.NamespaceSpecNS, "xmlns:" + prefix, namespace);
            }
        }	      
        return result;
    }


    /**
     * This method creates an Element in a given namespace with a given localname.
     * It uses the {@link ElementProxy#getDefaultPrefix} method to decide whether
     * a particular prefix is bound to that namespace.
     * <BR />
     * This method was refactored out of the constructor.
     *
     * @param doc
     * @param namespace
     * @param localName
     * @return The element created.
     */
    public static Element createElementForFamily(Document doc, String namespace, String localName) {
        Element result;
        String prefix = ElementProxy.getDefaultPrefix(namespace);

        if (namespace == null) {
            result = doc.createElementNS(null, localName);
        } else {
            if ((prefix == null) || (prefix.length() == 0)) {
                result = doc.createElementNS(namespace, localName);
                result.setAttributeNS(Constants.NamespaceSpecNS, "xmlns", namespace);
            } else {
                result = doc.createElementNS(namespace, prefix + ":" + localName);
                result.setAttributeNS(Constants.NamespaceSpecNS, "xmlns:" + prefix, namespace);
            }
        }

        return result;
    }

    /**
     * Returns the Element which was constructed by the Object.
     *
     * @return the Element which was constructed by the Object.
     */
    public final Element getElement() {
        return this.constructionElement;
    }

    /**
     * Returns the Element plus a leading and a trailing CarriageReturn Text node.
     *
     * @return the Element which was constructed by the Object.
     */
    public final NodeList getElementPlusReturns() {

        HelperNodeList nl = new HelperNodeList();

        nl.appendChild(this.doc.createTextNode("\n"));
        nl.appendChild(this.getElement());
        nl.appendChild(this.doc.createTextNode("\n"));

        return nl;
    }

    /**
     * Method getDocument
     *
     * @return the Document where this element is contained.
     */
    public Document getDocument() {
        return this.doc;
    }

    /**
     * Method getBaseURI
     *
     * @return the base uri of the namespace of this element
     */
    public String getBaseURI() {
        return this.baseURI;
    }

    /**
     * Method guaranteeThatElementInCorrectSpace
     *
     * @throws XMLSecurityException
     */
    void guaranteeThatElementInCorrectSpace() throws CanonicalizationException {

        String expectedLocalName = this.getBaseLocalName();
        String expectedNamespaceUri = this.getBaseNamespace();

        String actualLocalName = this.constructionElement.getLocalName();
        String actualNamespaceUri = this.constructionElement.getNamespaceURI();

        if(!expectedNamespaceUri.equals(actualNamespaceUri) 
            && !expectedLocalName.equals(actualLocalName)) {      
            Object exArgs[] = { actualNamespaceUri + ":" + actualLocalName, 
                                expectedNamespaceUri + ":" + expectedLocalName};
            throw new CanonicalizationException("xml.WrongElement", exArgs);
        }
    }

    /**
     * Method addText
     *
     * @param text
     */
    public void addText(String text) {
        if (text != null) {
            Text t = this.doc.createTextNode(text);

            this.constructionElement.appendChild(t);
        }
    }

    /**
     * Method getTextFromChildElement
     *
     * @param localname
     * @param namespace
     * @return the Text of the textNode
     */
    public String getTextFromChildElement(String localname, String namespace) {
        return XMLUtils.selectNode(
                this.constructionElement.getFirstChild(),
                namespace,
                localname,
                0).getTextContent();
    }

    /**
     * Method getTextFromTextChild
     *
     * @return the Text obtained by concatenating all the text nodes of this 
     *    element
     */
    public String getTextFromTextChild() {
        return XMLUtils.getFullTextChildrenFromElement(this.constructionElement);
    }

    /**
     * Method length
     *
     * @param namespace
     * @param localname
     * @return the number of elements {namespace}:localname under this element
     */
    public int length(String namespace, String localname) {
        int number = 0;
        Node sibling = this.constructionElement.getFirstChild();
        while (sibling != null) {        
            if (localname.equals(sibling.getLocalName())
                && namespace.equals(sibling.getNamespaceURI())) {
                number++;
            }
            sibling = sibling.getNextSibling();
        }
        return number;
    }

    /**
     * Method getDefaultPrefix
     *
     * @param namespace
     * @return the default prefix bind to this element.
     */
    public static String getDefaultPrefix(String namespace) {
        return prefixMappings.get(namespace);
    }

}
