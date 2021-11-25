/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFile } from './file';
import { EcsHash } from './hash';

interface NestedFields {
  // Not all hash types are explicitly supported, see
  // https://github.com/elastic/ecs/pull/1569
  hash?: Pick<EcsHash, 'md5' | 'sha1' | 'sha256'>;
}

interface AttachmentNestedFields {
  file?: Pick<EcsFile, 'extension' | 'mime_type' | 'name' | 'size' | 'hash'>;
}

/**
 * No docs yet, see https://github.com/elastic/ecs/pull/1569
 *
 * @internal
 */
export interface EcsEmail extends NestedFields {
  attachments?: Attachment[];
  bcc?: string[];
  cc?: string[];
  content_type?: string;
  delivery_timestamp?: string;
  direction?: string;
  from?: string;
  local_id?: string;
  message_id?: string;
  origination_timestamp?: string;
  reply_to?: string;
  subject?: string;
  'subject.text'?: string;
  to?: string[];
  x_mailer?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Attachment extends AttachmentNestedFields {
  // intentionally empty
}
