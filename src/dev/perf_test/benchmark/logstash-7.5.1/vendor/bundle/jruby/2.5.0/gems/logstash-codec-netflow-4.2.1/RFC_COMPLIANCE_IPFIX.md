# IPFIX RFC compliance

The level of RFC compliance reached for collector-relevant requirements:

| RFC       | Level                                        |
|-----------|----------------------------------------------|
| RFC 7011  | 42% of RFC "MUST" requirements implemented   |
| RFC 7011  | 19% of RFC "SHOULD" requirements implemented |  
| RFC 7012  | 83% of IE data types supported
| RFC 7012  | 90% of IEs supported

## RFC 7011 collector compliance summary

Summary of collector-relevant requirements implemented versus the total collector-relevant requirements:

| Chapter                               |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 1. Introduction                       |     |     |     |
| 2. Terminology                        |     |     |     |
| 3. IPFIX message format               | 2/2 | 0/2 |     |
| 4. Specific reporting requirements    | 0/1 |     |     |
| 5. Timing considerations              |     | 0/2 |     |
| 6. Linkage with the Information Model |     | 0/1 | 0/1 |
| 7. Variable Length IE                 |     |     |     |
| 8. Template management                | 3/9 | 1/5 | 1/2 |
| 9. The collecting process's side      | 4/5 | 1/3 | 0/4 |
| 10. Transport protocol                | 5/8 | 1/3 | 3/3 |
| 11. Security considerations           | 0/8 | 1/5 | 2/3 |
| 12. Management considerations         |     |     |     |
| 13. IANA considerations               |     |     |     |

## RFC 7012 collector compliance summary

| Chapter                           | MUST |SHOULD| MAY | 
|-----------------------------------|------|------|-----|
| 1. Introduction                   |      |      |     |
| 2. Properties of IPFIX IE         |      |      |     |
| 3. Type Space                     |      |      |     |
| 4. IE identitfiers                |      |      |     |
| 5. IE                             |      |      |     |
| 6. Exteding the information model |      |      |     |
| 7. IANA considerations            |      |      | 0/1 |
| 8. Security considerations        |      |      |     |


## RFC7012 Information Elements data type support details

| IE data type          | Support | Variable Length support |
|-----------------------|---------|-------------------------|
| octetArray            | Yes     | Yes |
| unsigned8             | Yes     |     |
| unsigned16            | Yes     |     |
| unsigned32            | Yes     |     |
| unsigned64            | Yes     |     |
| signed8               | Yes     |     |
| signed16              | Yes     |     |
| signed32              | Yes     |     |
| signed64              | Yes     |     |
| float32               | Yes     |     |
| float64               | Yes     |     |
| boolean               | No      |     |
| macAddress            | Yes     |     |
| string                | Yes     | Yes |
| dateTimeSeconds       | Yes     |     |
| dateTimeMilliseconds  | Yes     |     |
| dateTimeMicroseconds  | Yes     |     |
| dateTimeNanoseconds   | Yes     |     |
| ipv4Address           | Yes     |     |
| ipv6Address           | Yes     |     |
| basicList             | No      |     |
| subTemplateList       | No      |     |
| subTemplateMultiList  | No      |     |

## RFC 7011 collector compliance details

The tables below detail the collector-relevant requirements, and whether or not they are implemented:

### 3. IPFIX Message Format

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
|3.1 Collecting Processes SHOULD use the Transport Session and the Observation Domain ID field to separate different export streams originating from the same Exporter.|  | NO | |
|3.4.1 Collecting Processes MUST NOT assume incremental Template IDs | YES | | |
|3.4.2.1 At a minimum, Collecting Processes SHOULD support as scope the observationDomainId, exportingProcessId, meteringProcessId, templateId, lineCardId, exporterIPv4Address, exporterIPv6Address, and ingressInterface Information Elements. | | ? | |
| 3.4.2.2 As Exporting Processes are free to allocate Template IDs as they see fit, Collecting Processes MUST NOT assume incremental Template IDs, or anything about the contents of an Options Template based on its Template ID alone | YES | | | 

### 4. Specific Reporting Requirements

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| The Collecting Process MUST check the possible combinations of Information Elements within the Options Template Records to correctly interpret the following Options Templates. | NO |  | |

### 5. Timing considerations

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 5.2 Collecting Processes SHOULD use the current date, or other contextual information, to properly interpret dateTimeSeconds values and the Export Time Message Header field. | | NO | |
| 5.2 Collecting Processes SHOULD use the current date, or other contextual information, to determine the NTP era in order to properly interpret dateTimeMicroseconds and dateTimeNanoseconds values in received Data Records | | NO | |

### 6. Linkage with the Information Model

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 6.1.6 Collecting Processes SHOULD detect and ignore IPFIX Messages containing ill-formed UTF-8 string values for Information Elements | | NO | | 
| 6.2. Reduced-size encoding of signed, unsigned, or float data types | | | NO |

### 8. Template Management

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
|8. The Collecting Process MUST store all received Template Record information for the duration of each Transport Session until reuse or withdrawal as described in Section 8.1, or expiry over UDP as described in Section 8.4, so that it can interpret the corresponding Data Records.| YES | | | 
|8. The Collecting Process MUST NOT assume that the Template IDs from a given Exporting Process refer to the same Templates as they did in previous Transport Sessions from the same Exporting Process| NO | | |
|8. Collecting Process MUST NOT use Templates from one Transport Session to decode Data Sets in a subsequent Transport Session.| NO | | |
|8. Collecting Processes MUST properly handle Templates with multiple identical Information Elements.| NO | | |
|8. a Collecting Process MUST NOT assume that the Data Set and the associated Template Set (or Options Template Set) are exported in the same IPFIX Message| YES | | |
|8. Though a Collecting Process normally receives Template Records from  the Exporting Process before receiving Data Records, this is not always the case, e.g., in the case of reordering or Collecting Process restart over UDP.  In these cases, the Collecting Process MAY buffer Data Records for which it has no Templates, to wait for Template Records describing them; however, note that in the presence of Template withdrawal and redefinition (Section 8.1) this may lead to incorrect interpretation of Data Records.| | | NO |
| 8.Different Observation Domains within a Transport Session MAY use the same Template ID value to refer to different Templates; Collecting Processes MUST properly handle this case.| NO | | |
| 8.1 After receiving a Template Withdrawal, a Collecting Process MUST stop using the Template to interpret subsequently exported Data Sets.  Note that this mechanism does not apply when UDP is used to transport IPFIX Messages; for that case, see Section 8.4.| NO | | |
|8.1 If a Collecting Process receives a Template Withdrawal for a Template  or Options Template it does not presently have stored, this indicates  a malfunctioning or improperly implemented Exporting Process.  The  continued receipt and interpretation of Data Records are still possible, but the Collecting Process MUST ignore the Template Withdrawal and SHOULD log the error.| | NO | |
| 8.1 If a Collecting Process receives a new Template Record or Options Template Record for an already-allocated Template ID, and that Template or Options Template is identical to the already-received Template or Options Template, it SHOULD log the retransmission | | NO | |
|8.1 If a Collecting Process receives a new Template Record or Options Template Record for an already-allocated Template ID, and that  Template or Options Template is different from the already-received  Template or Options Template, this indicates a malfunctioning or improperly implemented Exporting Process.  The continued receipt and unambiguous interpretation of Data Records for this Template ID are no longer possible, and the Collecting Process SHOULD log the error. | | NO | |
|8.4 The Collecting Process  MAY associate a lifetime with each Template received in a Transport  Session.  Templates not refreshed by the Exporting Process within the  lifetime can then be discarded by the Collecting Process.  The  Template lifetime at the Collecting Process MAY be exposed by a  configuration parameter or MAY be derived from observation of the  interval of periodic Template retransmissions from the Exporting  Process.  In this latter case, the Template lifetime SHOULD default to at least 3 times the observed retransmission rate. | | | PARTIAL|
|8.4 Template Withdrawals (Section 8.1) MUST NOT be sent by Exporting Processes exporting via UDP and MUST be ignored by Collecting Processes collecting via UDP | NO | | |
|8.4 When a Collecting Process receives a new Template Record or Options  Template Record via UDP for an already-allocated Template ID, and  that Template or Options Template is identical to the already  received Template or Options Template, it SHOULD NOT log the  retransmission, as this is the normal operation of Template refresh  over UDP.| | YES| |
|8.4 The Collecting Process MUST replace the Template or Options Template for that Template ID with the newly received Template or Options Template.  This is the normal operation of Template ID reuse over UDP. | YES |  | | 
|8.4 The Collecting Process SHOULD maintain the  following for all the current Template Records and Options Template  Records: <IPFIX Device, Exporter source UDP port, Collector IP  address, Collector destination UDP port, Observation Domain ID, Template ID, Template Definition, Last Received>. | | NO| |

### 9. The collecting process's side

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
|9. The Collecting Process MUST listen for association requests /  connections to start new Transport Sessions from the Exporting Process. | YES | | |
|9. The Collecting Process MUST note the Information Element identifier of any Information Element that it does not understand and MAY discard that Information Element from received Data Records.| YES | | |
|9. The Collecting Process MUST accept padding in Data Records and   Template Records. | YES | | | 
| 9. A Collector can detect out-of-sequence, dropped, or duplicate IPFIX Messages by tracking the Sequence Number.  A Collector SHOULD provide a logging mechanism for tracking out-of- sequence IPFIX Messages. | | NO | |
| 9.1 If the Collecting Process receives a malformed IPFIX Message, it MUST discard the IPFIX Message and SHOULD log the error. | YES | YES | |
| 9.1 The Collecting Process MAY attempt to rectify the situation any way it sees fit, including: | | | NO |
| 9.1 On the other hand, the Collecting Process SHOULD stop processing IPFIX Messages from clearly malfunctioning Exporting Processes (e.g., those from  which the last few IPFIX Messages have been malformed). | | NO | |
| 9.2 The Collecting Process MUST support the opening of multiple SCTP Streams | NO | | | 
| 9.3 The Collecting Process MAY discard all Transport Session state after no IPFIX Messages are received from a given Exporting Process within a given Transport Session during a configurable idle timeout. | | | NO |
| 9.3 The Collecting Process SHOULD accept Data Records without the associated Template Record (or other definitions such as Common Properties) required to decode the Data Record. | | NO | |
| 9.3 If the Template  Records or other definitions have not been received at the time Data  Records are received, the Collecting Process MAY store the Data  Records for a short period of time and decode them after the Template Records or other definitions are received | | | NO |

### 10. Transport protocol

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 10. A Collecting Process MUST be able to handle IPFIX Message lengths of up to 65535 octets. | YES (LS>v5.1)| | |
|10. Transport Session state MUST NOT be migrated by an  Exporting Process or Collecting Process among Transport Sessions using different transport protocols between the same Exporting Process and Collecting Process pair | NO | | |
|10.1 SCTP [RFC4960] using the Partially Reliable SCTP (PR-SCTP) extension as specified in [RFC3758] MUST be implemented by all compliant implementations. | NO | | | 
|10.1 UDP [UDP] MAY also be implemented by compliant implementations | | | YES |
|10.1 TCP [TCP] MAY also be implemented by compliant implementations. | | | YES |
|10.1 It MUST be possible to configure both the Exporting and Collecting Processes to use different ports than the default. | YES | | |
| 10.1 By default, the Collecting Process   listens for secure connections on SCTP, TCP, and/or UDP port 4740 | | | NO |
| 10.2.4 When a Collecting Process no longer wants to receive IPFIX Messages, it SHOULD shut down its end of the association.  The Collecting Process SHOULD continue to receive and process IPFIX Messages until the Exporting Process has closed its end of the association. | | NO | | 
|10.2.4 When a Collecting Process detects that the SCTP association has been abnormally terminated, it MUST continue to listen for a new association establishment. | NO | | |
| 10.2.4 When an Exporting Process detects that the SCTP association to the Collecting Process is abnormally terminated, it SHOULD try to re-establish the association. | | NO | | 
| 10.3 UDP  MAY be used in deployments where Exporters and Collectors always communicate over dedicated links that are not susceptible to congestion | | | YES |
| 10.3.2 UDP MUST NOT be used unless the application can tolerate some loss of IPFIX Messages. | | | |
| 10.4 When a Collecting Process detects that the TCP connection to the Exporting Process has terminated abnormally, it MUST continue to listen for a new connection. | YES | | |
|10.4 When a Collecting Process no longer wants to receive IPFIX Messages, it SHOULD close its end of the connection.  The Collecting Process SHOULD continue to read IPFIX Messages until the Exporting Process  has closed its end. | | YES | |

### 11. Security Considerations

| Requirement                           |MUST |SHOULD| MAY| 
|---------------------------------------|-----|-----|-----|
| 11. IPFIX Exporting Processes and Collecting Processes using UDP or SCTP MUST support DTLS version 1.0 and SHOULD support DTLS version 1.2 [RFC6347], including the mandatory ciphersuite(s) specified in each version. | NO | | |
| 11. Exporting and Collecting Processes MUST NOT request, offer, or use any version of the Secure Socket Layer (SSL), or any version of TLS prior to 1.1, due to known security vulnerabilities in prior versions of TLS| NO | | | 11.3 When using TLS or DTLS, IPFIX Exporting Processes and IPFIX   Collecting Processes SHOULD be identified by a certificate containing  the DNS-ID | | NO | |
| 11.3 The inclusion of  Common Names (CN-IDs) in certificates identifying IPFIX Exporting Processes or Collecting Processes is NOT RECOMMENDED. | | NO | |
|11.3 To prevent man-in-the-middle attacks from impostor Exporting or  Collecting Processes, the acceptance of data from an unauthorized  Exporting Process, or the export of data to an unauthorized  Collecting Process, mutual authentication MUST be used for both TLS and DTLS. | NO | | |
| 11.3 Collecting Processes MUST verify the reference identifiers of the Exporting Processes from which they are receiving IPFIX Messages against those stored in the certificates | NO | | |
| 11.3 Collecting Processes MUST NOT accept IPFIX Messages from non-verified Exporting Processes. | NO | | |
| 11.3 Exporting Processes and Collecting Processes MUST support the verification of certificates against an explicitly authorized list of peer certificates identified by Common Name and SHOULD support the  verification of reference identifiers by matching the DNS-ID or CN-ID with a DNS lookup of the peer. | NO | | | 
| 11.3 IPFIX Exporting Processes and Collecting Processes MUST use non-NULL ciphersuites for authentication, integrity, and confidentiality. | NO | | |
| 11.4 Collector rate limiting SHOULD be  used to protect TLS and DTLS| |NO  | |
| 11.4 SYN cookies SHOULD be used by any Collecting Process accepting TCP connections. | | YES | |
| 11.4 These rate and state limits MAY be provided by a Collecting Process, and if provided, the limits SHOULD be user configurable. | | | NO |
| 11.5 IPFIX Message traffic transported via UDP and not secured via DTLS SHOULD be protected via segregation to a dedicated network. | | | |
| 11.6 IPFIX Collecting Processes MUST detect potential IPFIX Message insertion or loss conditions by tracking the IPFIX Sequence Number and SHOULD provide a logging mechanism for reporting out-of-sequence messages.  | NO | | |  
| 11.6 IPFIX Exporting and Collecting Processes SHOULD log any connection attempt that fails due to authentication failure | | NO | |
| 11.6 IPFIX Exporting and Collecting Processes SHOULD detect and log any SCTP association reset or TCP connection reset. | | NO | | 
| 11.7 As IPFIX uses length-prefix encodings, Collector implementors should take care to ensure the detection of inconsistent values that could impact IPFIX Message decoding, and proper operation in the presence of such inconsistent values. | | | YES |
| 11.7 Specifically, IPFIX Message, Set, and variable-length Information  Element lengths must be checked for consistency to avoid buffer-sizing vulnerabilities. | | | YES |


## RFC7012 Information Elements support details

IE 1-433 are supported

These are not yet supported:

|id | name                | data type
|---|---------------------|-------------------------
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

 
