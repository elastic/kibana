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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;


import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.ProcessingInstruction;
import org.w3c.dom.Text;

/**
 * DOM and XML accessibility and comfort functions.
 *
 * @author Christian Geuer-Pollmann
 */
public class XMLUtils {

    /**
     * Constructor XMLUtils
     *
     */
    private XMLUtils() {
        // we don't allow instantiation
    }

    /**
     * Method getFullTextChildrenFromElement
     *
     * @param element
     * @return the string of children
     */
    public static String getFullTextChildrenFromElement(Element element) {
        StringBuilder sb = new StringBuilder();

        Node child = element.getFirstChild();
        while (child != null) {
            if (child.getNodeType() == Node.TEXT_NODE) {
                sb.append(((Text)child).getData());
            }
            child = child.getNextSibling();
        }

        return sb.toString();
    }

    /**
     * This method returns the owner document of a particular node.
     * This method is necessary because it <I>always</I> returns a
     * {@link Document}. {@link Node#getOwnerDocument} returns <CODE>null</CODE>
     * if the {@link Node} is a {@link Document}.
     *
     * @param node
     * @return the owner document of the node
     */
    public static Document getOwnerDocument(Node node) {
        if (node.getNodeType() == Node.DOCUMENT_NODE) {
            return (Document) node;
        }
        try {
            return node.getOwnerDocument();
        } catch (NullPointerException npe) {
            throw new NullPointerException(npe.getMessage());
        }
    }

    /**
     * This method returns the first non-null owner document of the Nodes in this Set.
     * This method is necessary because it <I>always</I> returns a
     * {@link Document}. {@link Node#getOwnerDocument} returns <CODE>null</CODE>
     * if the {@link Node} is a {@link Document}.
     *
     * @param xpathNodeSet
     * @return the owner document
     */
    public static Document getOwnerDocument(Set<Node> xpathNodeSet) {
        NullPointerException npe = null;
        for (Node node : xpathNodeSet) {
            int nodeType = node.getNodeType();
            if (nodeType == Node.DOCUMENT_NODE) {
                return (Document) node;
            }
            try {
                if (nodeType == Node.ATTRIBUTE_NODE) {
                    return ((Attr)node).getOwnerElement().getOwnerDocument();
                }
                return node.getOwnerDocument();
            } catch (NullPointerException e) {
                npe = e;
            }
        }

        throw new NullPointerException(npe.getMessage());
    }

    /**
     * Method convertNodelistToSet
     *
     * @param xpathNodeSet
     * @return the set with the nodelist
     */
    public static Set<Node> convertNodelistToSet(NodeList xpathNodeSet) {
        if (xpathNodeSet == null) {
            return new HashSet<Node>();
        }

        int length = xpathNodeSet.getLength();
        Set<Node> set = new HashSet<Node>(length);

        for (int i = 0; i < length; i++) {
            set.add(xpathNodeSet.item(i));
        }

        return set;
    }

    /**
     * This method spreads all namespace attributes in a DOM document to their
     * children. This is needed because the XML Signature XPath transform
     * must evaluate the XPath against all nodes in the input, even against
     * XPath namespace nodes. Through a bug in XalanJ2, the namespace nodes are
     * not fully visible in the Xalan XPath model, so we have to do this by
     * hand in DOM spaces so that the nodes become visible in XPath space.
     *
     * @param doc
     * @see <A HREF="http://nagoya.apache.org/bugzilla/show_bug.cgi?id=2650">
     * Namespace axis resolution is not XPath compliant </A>
     */
    public static void circumventBug2650(Document doc) {

        Element documentElement = doc.getDocumentElement();

        // if the document element has no xmlns definition, we add xmlns=""
        Attr xmlnsAttr =
            documentElement.getAttributeNodeNS(Constants.NamespaceSpecNS, "xmlns");

        if (xmlnsAttr == null) {
            documentElement.setAttributeNS(Constants.NamespaceSpecNS, "xmlns", "");
        }

        XMLUtils.circumventBug2650internal(doc);
    }

    /**
     * This is the work horse for {@link #circumventBug2650}.
     *
     * @param node
     * @see <A HREF="http://nagoya.apache.org/bugzilla/show_bug.cgi?id=2650">
     * Namespace axis resolution is not XPath compliant </A>
     */
    @SuppressWarnings("fallthrough")
    private static void circumventBug2650internal(Node node) {
        Node parent = null;
        Node sibling = null;
        final String namespaceNs = Constants.NamespaceSpecNS;
        do {
            switch (node.getNodeType()) {
            case Node.ELEMENT_NODE :
                Element element = (Element) node;
                if (!element.hasChildNodes()) {
                    break;
                }
                if (element.hasAttributes()) {
                    NamedNodeMap attributes = element.getAttributes();
                    int attributesLength = attributes.getLength();

                    for (Node child = element.getFirstChild(); child!=null;
                        child = child.getNextSibling()) {

                        if (child.getNodeType() != Node.ELEMENT_NODE) {
                            continue;
                        }
                        Element childElement = (Element) child;

                        for (int i = 0; i < attributesLength; i++) {
                            Attr currentAttr = (Attr) attributes.item(i);
                            if (!namespaceNs.equals(currentAttr.getNamespaceURI())) {
                                continue;
                            }
                            if (childElement.hasAttributeNS(namespaceNs,
                                                            currentAttr.getLocalName())) {
                                continue;
                            }
                            childElement.setAttributeNS(namespaceNs,
                                                        currentAttr.getName(),
                                                        currentAttr.getNodeValue());
                        }
                    }
                }
            case Node.ENTITY_REFERENCE_NODE :
            case Node.DOCUMENT_NODE :
                parent = node;
                sibling = node.getFirstChild();
                break;
            }
            while ((sibling == null) && (parent != null)) {
                sibling = parent.getNextSibling();
                parent = parent.getParentNode();
            }
            if (sibling == null) {
                return;
            }

            node = sibling;
            sibling = node.getNextSibling();
        } while (true);
    }

    /**
     * @param sibling
     * @param uri
     * @param nodeName
     * @param number
     * @return nodes with the constrain
     */
    public static Text selectNodeText(Node sibling, String uri, String nodeName, int number) {
        Node n = selectNode(sibling,uri,nodeName,number);
        if (n == null) {
            return null;
        }
        n = n.getFirstChild();
        while (n != null && n.getNodeType() != Node.TEXT_NODE) {
            n = n.getNextSibling();
        }
        return (Text)n;
    }

    /**
     * @param sibling
     * @param uri
     * @param nodeName
     * @param number
     * @return nodes with the constrain
     */
    public static Element selectNode(Node sibling, String uri, String nodeName, int number) {
        while (sibling != null) {
            if (sibling.getNamespaceURI() != null && sibling.getNamespaceURI().equals(uri)
                && sibling.getLocalName().equals(nodeName)) {
                if (number == 0){
                    return (Element)sibling;
                }
                number--;
            }
            sibling = sibling.getNextSibling();
        }
        return null;
    }

    /**
     * @param sibling
     * @param uri
     * @param nodeName
     * @return nodes with the constraint
     */
    public static Element[] selectNodes(Node sibling, String uri, String nodeName) {
        List<Element> list = new ArrayList<Element>();
        while (sibling != null) {
            if (sibling.getNamespaceURI() != null && sibling.getNamespaceURI().equals(uri)
                && sibling.getLocalName().equals(nodeName)) {
                list.add((Element)sibling);
            }
            sibling = sibling.getNextSibling();
        }
        return list.toArray(new Element[list.size()]);
    }

    /**
     * @param signatureElement
     * @param inputSet
     * @return nodes with the constrain
     */
    public static Set<Node> excludeNodeFromSet(Node signatureElement, Set<Node> inputSet) {
        Set<Node> resultSet = new HashSet<Node>();
        Iterator<Node> iterator = inputSet.iterator();

        while (iterator.hasNext()) {
            Node inputNode = iterator.next();

            if (!XMLUtils.isDescendantOrSelf(signatureElement, inputNode)) {
                resultSet.add(inputNode);
            }
        }
        return resultSet;
    }

    /**
     * Method getStrFromNode
     *
     * @param xpathnode
     * @return the string for the node.
     */
    public static String getStrFromNode(Node xpathnode) {
        if (xpathnode.getNodeType() == Node.TEXT_NODE) {
            // we iterate over all siblings of the context node because eventually,
            // the text is "polluted" with pi's or comments
            StringBuilder sb = new StringBuilder();

            for (Node currentSibling = xpathnode.getParentNode().getFirstChild();
                currentSibling != null;
                currentSibling = currentSibling.getNextSibling()) {
                if (currentSibling.getNodeType() == Node.TEXT_NODE) {
                    sb.append(((Text) currentSibling).getData());
                }
            }

            return sb.toString();
        } else if (xpathnode.getNodeType() == Node.ATTRIBUTE_NODE) {
            return ((Attr) xpathnode).getNodeValue();
        } else if (xpathnode.getNodeType() == Node.PROCESSING_INSTRUCTION_NODE) {
            return ((ProcessingInstruction) xpathnode).getNodeValue();
        }

        return null;
    }

    /**
     * Returns true if the descendantOrSelf is on the descendant-or-self axis
     * of the context node.
     *
     * @param ctx
     * @param descendantOrSelf
     * @return true if the node is descendant
     */
    public static boolean isDescendantOrSelf(Node ctx, Node descendantOrSelf) {
        if (ctx == descendantOrSelf) {
            return true;
        }

        Node parent = descendantOrSelf;

        while (true) {
            if (parent == null) {
                return false;
            }

            if (parent == ctx) {
                return true;
            }

            if (parent.getNodeType() == Node.ATTRIBUTE_NODE) {
                parent = ((Attr) parent).getOwnerElement();
            } else {
                parent = parent.getParentNode();
            }
        }
    }

    /**
     * Returns the attribute value for the attribute with the specified name.
     * Returns null if there is no such attribute, or
     * the empty string if the attribute value is empty.
     *
     * <p>This works around a limitation of the DOM
     * <code>Element.getAttributeNode</code> method, which does not distinguish
     * between an unspecified attribute and an attribute with a value of
     * "" (it returns "" for both cases).
     *
     * @param elem the element containing the attribute
     * @param name the name of the attribute
     * @return the attribute value (may be null if unspecified)
     */
    public static String getAttributeValue(Element elem, String name) {
        Attr attr = elem.getAttributeNodeNS(null, name);
        return (attr == null) ? null : attr.getValue();
    }

    /**
     * This method is a tree-search to help prevent against wrapping attacks. It checks that no
     * two Elements have ID Attributes that match the "value" argument, if this is the case then
     * "false" is returned. Note that a return value of "true" does not necessarily mean that
     * a matching Element has been found, just that no wrapping attack has been detected.
     */
    public static boolean protectAgainstWrappingAttack(Node startNode, String value) {
        Node startParent = startNode.getParentNode();
        Node processedNode;
        Element foundElement = null;

        String id = value.trim();
        if (id.charAt(0) == '#') {
            id = id.substring(1);
        }

        while (startNode != null) {
            if (startNode.getNodeType() == Node.ELEMENT_NODE) {
                Element se = (Element) startNode;

                NamedNodeMap attributes = se.getAttributes();
                if (attributes != null) {
                    for (int i = 0; i < attributes.getLength(); i++) {
                        Attr attr = (Attr)attributes.item(i);
                        if (attr.isId() && id.equals(attr.getValue())) {
                            if (foundElement == null) {
                                // Continue searching to find duplicates
                                foundElement = attr.getOwnerElement();
                            } else {
                                //log.debug("Multiple elements with the same 'Id' attribute value!");
                                return false;
                            }
                        }
                    }
                }
            }

            processedNode = startNode;
            startNode = startNode.getFirstChild();

            // no child, this node is done.
            if (startNode == null) {
                // close node processing, get sibling
                startNode = processedNode.getNextSibling();
            }

            // no more siblings, get parent, all children
            // of parent are processed.
            while (startNode == null) {
                processedNode = processedNode.getParentNode();
                if (processedNode == startParent) {
                    return true;
                }
                // close parent node processing (processed node now)
                startNode = processedNode.getNextSibling();
            }
        }
        return true;
    }

    /**
     * This method is a tree-search to help prevent against wrapping attacks. It checks that no other
     * Element than the given "knownElement" argument has an ID attribute that matches the "value"
     * argument, which is the ID value of "knownElement". If this is the case then "false" is returned.
     */
    public static boolean protectAgainstWrappingAttack(
        Node startNode, Element knownElement, String value
    ) {
        Node startParent = startNode.getParentNode();
        Node processedNode;

        String id = value.trim();
        if (id.charAt(0) == '#') {
            id = id.substring(1);
        }

        while (startNode != null) {
            if (startNode.getNodeType() == Node.ELEMENT_NODE) {
                Element se = (Element) startNode;

                NamedNodeMap attributes = se.getAttributes();
                if (attributes != null) {
                    for (int i = 0; i < attributes.getLength(); i++) {
                        Attr attr = (Attr)attributes.item(i);
                        if (attr.isId() && id.equals(attr.getValue()) && se != knownElement) {
                            //log.debug("Multiple elements with the same 'Id' attribute value!");
                            return false;
                        }
                    }
                }
            }

            processedNode = startNode;
            startNode = startNode.getFirstChild();

            // no child, this node is done.
            if (startNode == null) {
                // close node processing, get sibling
                startNode = processedNode.getNextSibling();
            }

            // no more siblings, get parent, all children
            // of parent are processed.
            while (startNode == null) {
                processedNode = processedNode.getParentNode();
                if (processedNode == startParent) {
                    return true;
                }
                // close parent node processing (processed node now)
                startNode = processedNode.getNextSibling();
            }
        }
        return true;
    }

}
