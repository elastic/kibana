export const emailEcs = {
  attachments: {
    dashed_name: 'email-attachments',
    description: 'A list of objects describing the attachment files sent along with an email message.',
    flat_name: 'email.attachments',
    level: 'extended',
    name: 'attachments',
    normalize: [ 'array' ],
    short: 'List of objects describing the attachments.',
    type: 'nested',
    file: {
      extension: [Object],
      hash: [Object],
      mime_type: [Object],
      name: [Object],
      size: [Object]
    }
  },
  bcc: {
    address: {
      dashed_name: 'email-bcc-address',
      description: 'The email address of BCC recipient',
      example: 'bcc.user1@example.com',
      flat_name: 'email.bcc.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'bcc.address',
      normalize: [Array],
      short: 'Email address of BCC recipient',
      type: 'keyword'
    }
  },
  cc: {
    address: {
      dashed_name: 'email-cc-address',
      description: 'The email address of CC recipient',
      example: 'cc.user1@example.com',
      flat_name: 'email.cc.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'cc.address',
      normalize: [Array],
      short: 'Email address of CC recipient',
      type: 'keyword'
    }
  },
  content_type: {
    dashed_name: 'email-content-type',
    description: 'Information about how the message is to be displayed.\n' +
      'Typically a MIME type.',
    example: 'text/plain',
    flat_name: 'email.content_type',
    ignore_above: 1024,
    level: 'extended',
    name: 'content_type',
    normalize: [],
    short: 'MIME type of the email message.',
    type: 'keyword'
  },
  delivery_timestamp: {
    dashed_name: 'email-delivery-timestamp',
    description: 'The date and time when the email message was received by the service or client.',
    example: '2020-11-10T22:12:34.8196921Z',
    flat_name: 'email.delivery_timestamp',
    level: 'extended',
    name: 'delivery_timestamp',
    normalize: [],
    short: 'Date and time when message was delivered.',
    type: 'date'
  },
  direction: {
    dashed_name: 'email-direction',
    description: 'The direction of the message based on the sending and receiving domains.',
    example: 'inbound',
    flat_name: 'email.direction',
    ignore_above: 1024,
    level: 'extended',
    name: 'direction',
    normalize: [],
    short: 'Direction of the message.',
    type: 'keyword'
  },
  from: {
    address: {
      dashed_name: 'email-from-address',
      description: 'The email address of the sender, typically from the RFC 5322 `From:` header field.',
      example: 'sender@example.com',
      flat_name: 'email.from.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'from.address',
      normalize: [Array],
      short: "The sender's email address.",
      type: 'keyword'
    }
  },
  local_id: {
    dashed_name: 'email-local-id',
    description: 'Unique identifier given to the email by the source that created the event.\n' +
      'Identifier is not persistent across hops.',
    example: 'c26dbea0-80d5-463b-b93c-4e8b708219ce',
    flat_name: 'email.local_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'local_id',
    normalize: [],
    short: 'Unique identifier given by the source.',
    type: 'keyword'
  },
  message_id: {
    dashed_name: 'email-message-id',
    description: 'Identifier from the RFC 5322 `Message-ID:` email header that refers to a particular email message.',
    example: '81ce15$8r2j59@mail01.example.com',
    flat_name: 'email.message_id',
    level: 'extended',
    name: 'message_id',
    normalize: [],
    short: 'Value from the Message-ID header.',
    type: 'wildcard'
  },
  origination_timestamp: {
    dashed_name: 'email-origination-timestamp',
    description: 'The date and time the email message was composed. Many email clients will fill in this value automatically when the message is sent by a user.',
    example: '2020-11-10T22:12:34.8196921Z',
    flat_name: 'email.origination_timestamp',
    level: 'extended',
    name: 'origination_timestamp',
    normalize: [],
    short: 'Date and time the email was composed.',
    type: 'date'
  },
  reply_to: {
    address: {
      dashed_name: 'email-reply-to-address',
      description: 'The address that replies should be delivered to based on the value in the RFC 5322 `Reply-To:` header.',
      example: 'reply.here@example.com',
      flat_name: 'email.reply_to.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'reply_to.address',
      normalize: [Array],
      short: 'Address replies should be delivered to.',
      type: 'keyword'
    }
  },
  sender: {
    address: {
      dashed_name: 'email-sender-address',
      description: 'Per RFC 5322, specifies the address responsible for the actual transmission of the message.',
      flat_name: 'email.sender.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'sender.address',
      normalize: [],
      short: 'Address of the message sender.',
      type: 'keyword'
    }
  },
  subject: {
    dashed_name: 'email-subject',
    description: 'A brief summary of the topic of the message.',
    example: 'Please see this important message.',
    flat_name: 'email.subject',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'subject',
    normalize: [],
    short: 'The subject of the email message.',
    type: 'keyword'
  },
  to: {
    address: {
      dashed_name: 'email-to-address',
      description: 'The email address of recipient',
      example: 'user1@example.com',
      flat_name: 'email.to.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'to.address',
      normalize: [Array],
      short: 'Email address of recipient',
      type: 'keyword'
    }
  },
  x_mailer: {
    dashed_name: 'email-x-mailer',
    description: 'The name of the application that was used to draft and send the original email message.',
    example: 'Spambot v2.5',
    flat_name: 'email.x_mailer',
    ignore_above: 1024,
    level: 'extended',
    name: 'x_mailer',
    normalize: [],
    short: 'Application that drafted email.',
    type: 'keyword'
  }
}