/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Event details relating to an email transaction.
 * This field set focuses on the email message header, body, and attachments. Network protocols that send and receive email messages such as SMTP are outside the scope of the `email.*` fields.
 */
export interface EcsEmail {
  /**
   * A list of objects describing the attachment files sent along with an email message.
   */
  attachments?: Record<string, unknown>[];
  bcc?: {
    /**
     * The email address of BCC recipient
     */
    address?: string[];
  };

  cc?: {
    /**
     * The email address of CC recipient
     */
    address?: string[];
  };

  /**
   * Information about how the message is to be displayed.
   * Typically a MIME type.
   */
  content_type?: string;
  /**
   * The date and time when the email message was received by the service or client.
   */
  delivery_timestamp?: string;
  /**
   * The direction of the message based on the sending and receiving domains.
   */
  direction?: string;
  from?: {
    /**
     * The email address of the sender, typically from the RFC 5322 `From:` header field.
     */
    address?: string[];
  };

  /**
   * Unique identifier given to the email by the source that created the event.
   * Identifier is not persistent across hops.
   */
  local_id?: string;
  /**
   * Identifier from the RFC 5322 `Message-ID:` email header that refers to a particular email message.
   */
  message_id?: string;
  /**
   * The date and time the email message was composed. Many email clients will fill in this value automatically when the message is sent by a user.
   */
  origination_timestamp?: string;
  reply_to?: {
    /**
     * The address that replies should be delivered to based on the value in the RFC 5322 `Reply-To:` header.
     */
    address?: string[];
  };

  sender?: {
    /**
     * Per RFC 5322, specifies the address responsible for the actual transmission of the message.
     */
    address?: string;
  };

  /**
   * A brief summary of the topic of the message.
   */
  subject?: string;
  to?: {
    /**
     * The email address of recipient
     */
    address?: string[];
  };

  /**
   * The name of the application that was used to draft and send the original email message.
   */
  x_mailer?: string;
}
