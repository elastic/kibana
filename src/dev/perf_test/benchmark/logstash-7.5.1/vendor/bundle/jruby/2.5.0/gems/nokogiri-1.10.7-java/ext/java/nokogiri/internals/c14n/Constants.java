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

/**
 * Provides all constants and some translation functions for i18n.
 *
 * For the used Algorithm identifiers and Namespaces, look at the
 * <A HREF="http://www.w3.org/TR/xmldsig-core/#sec-TransformAlg">XML
 * Signature specification</A>.
 *
 * @author $Author: coheigea $
 */
public class Constants {
    
    /** The URI for XML spec*/
    public static final String XML_LANG_SPACE_SpecNS = "http://www.w3.org/XML/1998/namespace";
    
    /** The URI for XMLNS spec*/
    public static final String NamespaceSpecNS = "http://www.w3.org/2000/xmlns/";

    private Constants() {
        // we don't allow instantiation
    }

}
