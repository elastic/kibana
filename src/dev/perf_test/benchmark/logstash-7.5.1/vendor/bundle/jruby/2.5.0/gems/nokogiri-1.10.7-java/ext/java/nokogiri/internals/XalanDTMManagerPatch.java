/*
 * Copyright (c) 2017 [Karol Bucek](http://kares.org/)
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the  "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package nokogiri.internals;

import javax.xml.transform.dom.DOMSource;

import org.apache.xml.dtm.DTM;
import nokogiri.internals.dom2dtm.DOM2DTM;
import nokogiri.internals.dom2dtm.DOM2DTMdefaultNamespaceDeclarationNode;
import org.apache.xml.dtm.DTMWSFilter;
import org.apache.xml.res.XMLErrorResources;
import org.apache.xml.res.XMLMessages;
import org.w3c.dom.Node;

/**
 * @author kares
 */
public final class XalanDTMManagerPatch extends org.apache.xml.dtm.ref.DTMManagerDefault {

    /**
     * Given a W3C DOM node, try and return a DTM handle.
     * Note: calling this may be non-optimal, and there is no guarantee that
     * the node will be found in any particular DTM.
     *
     * @param node Non-null reference to a DOM node.
     *
     * @return a valid DTM handle.
     */
    @Override
    public /* synchronized */ int getDTMHandleFromNode(org.w3c.dom.Node node) {
        //if (node == null) // "node must be non-null for getDTMHandleFromNode!");
        //    throw new IllegalArgumentException(XMLMessages.createXMLMessage(XMLErrorResources.ER_NODE_NON_NULL, null));
        assert node != null;

        if (node instanceof org.apache.xml.dtm.ref.DTMNodeProxy) {
            return ((org.apache.xml.dtm.ref.DTMNodeProxy) node).getDTMNodeNumber();
        }

        // Find the DOM2DTMs wrapped around this Document (if any)
        // and check whether they contain the Node in question.
        //
        // NOTE that since a DOM2DTM may represent a subtree rather
        // than a full document, we have to be prepared to check more
        // than one -- and there is no guarantee that we will find
        // one that contains ancestors or siblings of the node we're
        // seeking.
        //
        // %REVIEW% We could search for the one which contains this
        // node at the deepest level, and thus covers the widest
        // subtree, but that's going to entail additional work
        // checking more DTMs... and getHandleOfNode is not a
        // cheap operation in most implementations.
        //
        // TODO: %REVIEW% If overflow addressing, we may recheck a DTM
        // already examined. Ouch. But with the increased number of DTMs,
        // scanning back to check this is painful.
        // POSSIBLE SOLUTIONS:
        //   Generate a list of _unique_ DTM objects?
        //   Have each DTM cache last DOM node search?
        for(int i = 0; i < m_dtms.length; i++) {
            DTM thisDTM = m_dtms[i];
            if (thisDTM instanceof DOM2DTM) {
                int handle = ((DOM2DTM) thisDTM).getHandleOfNode(node);
                if (handle != DTM.NULL) {
                    return handle;
                }
            }
        }

        // Not found; generate a new DTM.
        //
        // %REVIEW% Is this really desirable, or should we return null
        // and make folks explicitly instantiate from a DOMSource? The
        // latter is more work but gives the caller the opportunity to
        // explicitly add the DTM to a DTMManager... and thus to know when
        // it can be discarded again, which is something we need to pay much
        // more attention to. (Especially since only DTMs which are assigned
        // to a manager can use the overflow addressing scheme.)
        //
        // %BUG% If the source node was a DOM2DTM$defaultNamespaceDeclarationNode
        // and the DTM wasn't registered with this DTMManager, we will create
        // a new DTM and _still_ not be able to find the node (since it will
        // be resynthesized). Another reason to push hard on making all DTMs
        // be managed DTMs.

        // Since the real root of our tree may be a DocumentFragment, we need to
        // use getParent to find the root, instead of getOwnerDocument.  Otherwise
        // DOM2DTM#getHandleOfNode will be very unhappy.
        Node root = node; int rootType = root.getNodeType();
        Node p = (rootType == Node.ATTRIBUTE_NODE) ? ((org.w3c.dom.Attr) root).getOwnerElement() : root.getParentNode();
        for (; p != null; p = p.getParentNode()) root = p;

        // DOM2DTM dtm = (DOM2DTM) getDTM(new DOMSource(root), false, null);
        DOM2DTM dtm = getDTM(new DOMSource(root), false, null/*, true, true*/);

        int handle;

        if (node instanceof org.apache.xml.dtm.ref.dom2dtm.DOM2DTMdefaultNamespaceDeclarationNode
                || node instanceof DOM2DTMdefaultNamespaceDeclarationNode) {
            // Can't return the same node since it's unique to a specific DTM,
            // but can return the equivalent node -- find the corresponding
            // Document Element, then ask it for the xml: namespace decl.
            handle = dtm.getHandleOfNode(((org.w3c.dom.Attr) node).getOwnerElement());
            handle = dtm.getAttributeNode(handle, node.getNamespaceURI(), node.getLocalName());
        }
        else {
            handle = dtm.getHandleOfNode(node);

            rootType = root.getNodeType();
            // Is Node actually within the same document? If not, don't search!
            // This would be easier if m_root was always the Document node, but
            // we decided to allow wrapping a DTM around a subtree.
            if((root==node) ||
                (rootType==Node.DOCUMENT_NODE && root==node.getOwnerDocument()) ||
                (rootType!=Node.DOCUMENT_NODE && root.getOwnerDocument()==node.getOwnerDocument())
                )
            {
                // If node _is_ in m_root's tree, find its handle
                //
                // %OPT% This check may be improved significantly when DOM
                // Level 3 nodeKey and relative-order tests become
                // available!
                for (Node cursor = node; cursor != null;
                    cursor = (cursor.getNodeType()!=Node.ATTRIBUTE_NODE)
                            ? cursor.getParentNode()
                            : ((org.w3c.dom.Attr)cursor).getOwnerElement()) {
                    if (cursor==root) {
                        // We know this node; find its handle.
                        return (dtm).getHandleFromNode(node);
                    }
                } // for ancestors of node
            } // if node and m_root in same Document
        }

        if (DTM.NULL == handle)
            throw new RuntimeException(XMLMessages.createXMLMessage(XMLErrorResources.ER_COULD_NOT_RESOLVE_NODE, null)); //"Could not resolve the node to a handle!");

        return handle;
    }

    private DOM2DTM getDTM(DOMSource source, boolean unique, DTMWSFilter whiteSpaceFilter/*, boolean incremental, boolean doIndexing*/) {
        int dtmPos = getFirstFreeDTMID();
        int documentID = dtmPos << IDENT_DTM_NODE_BITS;

        DOM2DTM dtm = new DOM2DTM(this, source, documentID, whiteSpaceFilter, m_xsf, true);

        addDTM(dtm, dtmPos, 0);
        return dtm;
    }

}
