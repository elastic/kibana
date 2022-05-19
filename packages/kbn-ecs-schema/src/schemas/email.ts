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
      extension: {
        dashed_name: 'email-attachments-file-extension',
        description: 'Attachment file extension, excluding the leading dot.',
        example: 'txt',
        flat_name: 'email.attachments.file.extension',
        ignore_above: 1024,
        level: 'extended',
        name: 'attachments.file.extension',
        normalize: [],
        short: 'Attachment file extension.',
        type: 'keyword'
      },
      hash: {
        md5: {
          dashed_name: 'email-attachments-file-hash-md5',
          description: 'MD5 hash.',
          flat_name: 'email.attachments.file.hash.md5',
          ignore_above: 1024,
          level: 'extended',
          name: 'md5',
          normalize: [],
          original_fieldset: 'hash',
          short: 'MD5 hash.',
          type: 'keyword'
        },
        sha1: {
          dashed_name: 'email-attachments-file-hash-sha1',
          description: 'SHA1 hash.',
          flat_name: 'email.attachments.file.hash.sha1',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha1',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA1 hash.',
          type: 'keyword'
        },
        sha256: {
          dashed_name: 'email-attachments-file-hash-sha256',
          description: 'SHA256 hash.',
          flat_name: 'email.attachments.file.hash.sha256',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha256',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA256 hash.',
          type: 'keyword'
        },
        sha384: {
          dashed_name: 'email-attachments-file-hash-sha384',
          description: 'SHA384 hash.',
          flat_name: 'email.attachments.file.hash.sha384',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha384',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA384 hash.',
          type: 'keyword'
        },
        sha512: {
          dashed_name: 'email-attachments-file-hash-sha512',
          description: 'SHA512 hash.',
          flat_name: 'email.attachments.file.hash.sha512',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha512',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA512 hash.',
          type: 'keyword'
        },
        ssdeep: {
          dashed_name: 'email-attachments-file-hash-ssdeep',
          description: 'SSDEEP hash.',
          flat_name: 'email.attachments.file.hash.ssdeep',
          ignore_above: 1024,
          level: 'extended',
          name: 'ssdeep',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SSDEEP hash.',
          type: 'keyword'
        },
        tlsh: {
          dashed_name: 'email-attachments-file-hash-tlsh',
          description: 'TLSH hash.',
          flat_name: 'email.attachments.file.hash.tlsh',
          ignore_above: 1024,
          level: 'extended',
          name: 'tlsh',
          normalize: [],
          original_fieldset: 'hash',
          short: 'TLSH hash.',
          type: 'keyword'
        }
      },
      mime_type: {
        dashed_name: 'email-attachments-file-mime-type',
        description: 'The MIME media type of the attachment.\n' +
          'This value will typically be extracted from the `Content-Type` MIME header field.',
        example: 'text/plain',
        flat_name: 'email.attachments.file.mime_type',
        ignore_above: 1024,
        level: 'extended',
        name: 'attachments.file.mime_type',
        normalize: [],
        short: 'MIME type of the attachment file.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'email-attachments-file-name',
        description: 'Name of the attachment file including the file extension.',
        example: 'attachment.txt',
        flat_name: 'email.attachments.file.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'attachments.file.name',
        normalize: [],
        short: 'Name of the attachment file.',
        type: 'keyword'
      },
      size: {
        dashed_name: 'email-attachments-file-size',
        description: 'Attachment file size in bytes.',
        example: 64329,
        flat_name: 'email.attachments.file.size',
        level: 'extended',
        name: 'attachments.file.size',
        normalize: [],
        short: 'Attachment file size.',
        type: 'long'
      }
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
      normalize: [ 'array' ],
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
      normalize: [ 'array' ],
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
      normalize: [ 'array' ],
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
      normalize: [ 'array' ],
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
    multi_fields: [
      {
        flat_name: 'email.subject.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
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
      normalize: [ 'array' ],
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