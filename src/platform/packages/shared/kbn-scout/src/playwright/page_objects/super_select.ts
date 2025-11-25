/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v 1"; you may not use this file
 * except in compliance with, at your election, the "Elastic License 2.0" or the
 * "GNU Affero General Public License v 1".
 */

import { EuiSuperSelectWrapper } from '../eui_components';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';
import type { SelectorInput } from '../utils';

export class SuperSelect {
  constructor(private readonly page: ScoutPage) {}

  getSuperSelect(selector: SelectorInput): EuiSuperSelectWrapper {
    return new EuiSuperSelectWrapper(this.page, selector);
  }

  async getSelectedValue(selector: SelectorInput): Promise<string> {
    const superSelect = this.getSuperSelect(selector);
    return await superSelect.getSelectedValue();
  }

  async selectOption(selector: SelectorInput, value: string): Promise<void> {
    const superSelect = this.getSuperSelect(selector);
    return await superSelect.selectOption(value);
  }

  async isDisabled(selector: SelectorInput): Promise<boolean> {
    const superSelect = this.getSuperSelect(selector);
    return await superSelect.isDisabled();
  }
}
