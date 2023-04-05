/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields describing DNS queries and answers.
 * DNS events should either represent a single DNS query prior to getting answers (`dns.type:query`) or they should represent a full exchange and contain the query details as well as all of the answers that were provided for this query (`dns.type:answer`).
 */
export interface EcsDns {
  /**
   * An array containing an object for each answer section returned by the server.
   * The main keys that should be present in these objects are defined by ECS. Records that have more information may contain more keys than what ECS defines.
   * Not all DNS data sources give all details about DNS answers. At minimum, answer objects must contain the `data` key. If more information is available, map as much of it to ECS as possible, and add any additional fields to the answer objects as custom fields.
   */
  answers?: Array<Record<string, unknown>>;
  /**
   * Array of 2 letter DNS header flags.
   */
  header_flags?: string[];
  /**
   * The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.
   */
  id?: string;
  /**
   * The DNS operation code that specifies the kind of query in the message. This value is set by the originator of a query and copied into the response.
   */
  op_code?: string;
  question?: {
    /**
     * The class of records being queried.
     */
    class?: string;
    /**
     * The name being queried.
     * If the name field contains non-printable characters (below 32 or above 126), those characters should be represented as escaped base 10 integers (\DDD). Back slashes and quotes should be escaped. Tabs, carriage returns, and line feeds should be converted to \t, \r, and \n respectively.
     */
    name?: string;
    /**
     * The highest registered domain, stripped of the subdomain.
     * For example, the registered domain for "foo.example.com" is "example.com".
     * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".
     */
    registered_domain?: string;
    /**
     * The subdomain is all of the labels under the registered_domain.
     * If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.
     */
    subdomain?: string;
    /**
     * The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".
     * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".
     */
    top_level_domain?: string;
    /**
     * The type of record being queried.
     */
    type?: string;
  };

  /**
   * Array containing all IPs seen in `answers.data`.
   * The `answers` array can be difficult to use, because of the variety of data formats it can contain. Extracting all IP addresses seen in there to `dns.resolved_ip` makes it possible to index them as IP addresses, and makes them easier to visualize and query for.
   */
  resolved_ip?: string[];
  /**
   * The DNS response code.
   */
  response_code?: string;
  /**
   * The type of DNS event captured, query or answer.
   * If your source of DNS events only gives you DNS queries, you should only create dns events of type `dns.type:query`.
   * If your source of DNS events gives you answers as well, you should create one event per query (optionally as soon as the query is seen). And a second event containing all query details as well as an array of answers.
   */
  type?: string;
}
