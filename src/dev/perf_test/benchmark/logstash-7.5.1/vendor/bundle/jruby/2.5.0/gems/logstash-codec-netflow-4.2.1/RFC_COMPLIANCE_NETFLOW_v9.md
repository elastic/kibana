# Netflow v9 compliance

The level of RFC compliance reached for collector-relevant requirements:

| RFC       | Level                                        |
|-----------|----------------------------------------------|
| RFC 3954  | 100% of RFC "MUST" requirements implemented  |
| RFC 3954  | 0% of RFC "SHOULD" requirements implemented  |  
| RFC 3954  | 83% of IEs 1-127 supported                   |
| RFC 3954  | 90% of IEs 127-32768 supported               |

## RFC 3954 collector compliance summary

Summary of collector-relevant requirements implemented versus the total collector-relevant requirements:

| Chapter                                      |MUST |SHOULD| MAY| 
|----------------------------------------------|-----|-----|-----|
| 1. Introduction                              |     |     |     |
| 2. Terminology                               |     |     |     |
| 3. NetFlow High-Level Picture on the Exporter|     |     |     |
| 4. Packet layout                             |     |     |     |
| 5. Export packet format                      | 1/1 | 0/2 |     |
| 6. Options                                   | 1/1 |     |     |
| 7. Template management                       | 3/3 |     |     |
| 8. Field type definitions                    |     |     |     |
| 9. The collector side                        | 5/5 | 0/3 |     |
| 10. Security considerations                  |     |     |     |

## RFC 3954 collector compliance details

The tables below detail the collector-relevant requirements, and whether or not they are implemented:

### 5. Export packet format

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 5.1 Incremental sequence counter of all Export Packets sent from the current Observation Domain by the Exporter.  This value MUST be cumulative, and SHOULD be used by the Collector to identify whether any Export Packets have been missed. | | NO |  |
| 5.1 NetFlow Collectors SHOULD use the combination of the source IP  address and the Source ID field to separate different export streams originating from the same Exporter. | | NO | |
| 5.3 The Collector MUST use the FlowSet ID to find the corresponding Template Record and decode the Flow Records from the FlowSet. | YES | | |

### 6. Options

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 6.2 The Collector MUST use the FlowSet ID to map the appropriate type and length to any field values that follow. | YES | | |

### 7. Template management

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 7. the NetFlow Collector MUST store the Template Record to interpret the corresponding Flow Data Records that are received in subsequent data packets. | YES | | |
| 7.  A NetFlow Collector that receives Export Packets from several Observation Domains from the same Exporter MUST be aware that the uniqueness of the Template ID is not guaranteed across Observation Domains. | YES | | | 
| 7.  If a Collector should receive a new definition for an already existing Template ID, it MUST discard the previous template definition and use the new one. | YES | | |

### 9. The collector side

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 9. If the Template Records have not been received at the time Flow Data Records (or Options Data Records) are received, the Collector SHOULD store the Flow Data Records (or Options Data Records) and decode them after the Template Records are received. | | NO | |
| 9. A Collector device MUST NOT assume that the Data FlowSet and the associated Template FlowSet (or Options Template FlowSet) are exported in the same Export Packet. | YES | | | 
| 9. The Collector MUST NOT assume that one and only one Template FlowSet is present in an Export Packet. | YES | | | 
| 9. The Collector MUST NOT attempt to decode the Flow or Options Data Records with an expired Template. | YES | | | 
| 9. At any given time the Collector SHOULD maintain the following for all the current Template Records and Options Template Records: Exporter, Observation Domain, Template ID, Template Definition, Last Received. | | NO | |
| 9. In the event of a clock configuration change on the Exporter, the  Collector SHOULD discard all Template Records and Options Template  Records associated with that Exporter, in order for Collector to learn the new set of fields: Exporter, Observation Domain, Template ID, Template Definition, Last Received. | | NO | |
| 9. If the Collector receives a new Template Record (for example, in the case of an Exporter restart) it MUST immediately override the existing Template Record. | YES | | |
| 9. Finally, note that the Collector MUST accept padding in the Data  FlowSet and Options Template FlowSet, which means for the Flow Data Records, the Options Data Records and the Template Records. | YES | | |



## RFC 3954 Information Elements support details

From the IEs 1-127, these are not yet supported:

|id | name                
|---|--------------
|70 |MPLS_LABEL_1 
|71 |MPLS_LABEL_2 
|72 |MPLS_LABEL_3 
|73 |MPLS_LABEL_4 
|74 |MPLS_LABEL_5 
|75 |MPLS_LABEL_6 
|76 |MPLS_LABEL_7 
|77 |MPLS_LABEL_8 
|78 |MPLS_LABEL_9
|79 |MPLS_LABEL_10  
|90 | MPLS PAL RD
|91 | MPLS PREFIX LEN
|92 | SRC TRAFFIC INDEX
|93 | DST TRAFFIC INDEX
|95 | APPLICATION TAG
|99 | replication factor
|102| layer2packetSectionOffset
|103| layer2packetSectionSize
|104| layer2packetSectionData

From the IEs 128-, these are not yet supported:

|id | name         |data type       
|---|--------------|-----
|434|mibObjectValueInteger|signed32
|435|mibObjectValueOctetString|octetArray
|436|mibObjectValueOID|octetArray
|437|mibObjectValueBits|octetArray
|438|mibObjectValueIPAddress|ipv4Address
|439|mibObjectValueCounter|unsigned64
|440|mibObjectValueGauge|unsigned32
|441|mibObjectValueTimeTicks|unsigned32
|442|mibObjectValueUnsigned|unsigned32
|443|mibObjectValueTable|subTemplateList
|444|mibObjectValueRow|subTemplateList
|445|mibObjectIdentifier|octetArray
|446|mibSubIdentifier|unsigned32
|447|mibIndexIndicator|unsigned64
|448|mibCaptureTimeSemantics|unsigned8
|449|mibContextEngineID|octetArray
|450|mibContextName|string
|451|mibObjectName|string
|452|mibObjectDescription|string
|453|mibObjectSyntax|string
|454|mibModuleName|string
|455|mobileIMSI|string
|456|mobileMSISDN|string
|457|httpStatusCode|unsigned16
|458|sourceTransportPortsLimit|unsigned16
|459|httpRequestMethod|string
|460|httpRequestHost|string
|461|httpRequestTarget|string
|462|httpMessageVersion|string
|463|natInstanceID|unsigned32
|464|internalAddressRealm|octetArray
|465|externalAddressRealm|octetArray
|466|natQuotaExceededEvent|unsigned32
|467|natThresholdEvent|unsigned32
|468|httpUserAgent|string
|469|httpContentType|string
|470|httpReasonPhrase|string

