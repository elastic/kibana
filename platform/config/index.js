// @flow

import { schema } from './schema';

import { type TypeOf } from '../lib/schema';

type ConfigType = TypeOf<typeof schema>;

export class Config {
  config: ConfigType;

  constructor(config: ConfigType) {
    this.config = config;
  }

  atPath(key: $Keys<ConfigType>) {
    return this.config[key];
  }

  static create(rawConfig: { [string]: any }) {
    return new Config(schema.validate(rawConfig));
  }
}
