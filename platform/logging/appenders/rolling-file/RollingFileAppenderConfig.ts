import { Duration } from 'moment';
import * as schema from '../../../lib/schema';
import { ByteSizeValue } from '../../../lib/ByteSizeValue';
import { BaseAppenderConfig, BaseAppenderRawConfigSchema } from '../base/BaseAppenderConfig'
import { RollingFileAppender } from './RollingFileAppender';

export const RollingFileAppenderConfigSchema = schema.object({
  ...BaseAppenderRawConfigSchema,
  kind: schema.literal('rolling-file'),
  policy: schema.oneOf([
    schema.object({
      kind: schema.literal('time'),
      limit: schema.duration()
    }),
    schema.object({
      kind: schema.literal('size'),
      limit: schema.byteSize()
    })
  ]),
  path: schema.string()
});

class RollingPolicyConfig<TLimit> {
  constructor(readonly kind: string, readonly limit: TLimit) {}
}

export class RollingFileAppenderConfig extends BaseAppenderConfig {
  readonly path: string;
  readonly policy: RollingPolicyConfig<Duration | ByteSizeValue>;

  constructor(schema: schema.TypeOf<typeof RollingFileAppenderConfigSchema>) {
    super(schema);

    this.path = schema.path;
    this.policy = schema.policy.kind === 'size' ?
      new RollingPolicyConfig(schema.policy.kind, schema.policy.limit) :
      new RollingPolicyConfig(schema.policy.kind, schema.policy.limit)
  }

  createAppender(): RollingFileAppender {
    return new RollingFileAppender(this);
  }
}
