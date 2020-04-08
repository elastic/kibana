#ifndef NOKOGIRI_XML_NAMESPACE
#define NOKOGIRI_XML_NAMESPACE

#include <nokogiri.h>

void init_xml_namespace();

extern VALUE cNokogiriXmlNamespace ;

VALUE Nokogiri_wrap_xml_namespace(xmlDocPtr doc, xmlNsPtr node);

#define NOKOGIRI_NAMESPACE_EH(node) ((node)->type == XML_NAMESPACE_DECL)

#endif
