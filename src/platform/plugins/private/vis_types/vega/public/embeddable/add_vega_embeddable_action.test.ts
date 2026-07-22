/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { getDefaultSpec } from '../default_spec';
import { getAddVegaEmbeddableAction } from './add_vega_embeddable_action';

jest.mock('../default_spec', () => ({ getDefaultSpec: () => '{ mark: point }' }));

describe('getAddVegaEmbeddableAction', () => {
  it('adds one default Vega panel and opens its Dashboard editor', async () => {
    const onEdit = jest.fn();
    const addNewPanel = jest.fn().mockResolvedValue({ onEdit });
    const action = getAddVegaEmbeddableAction();

    await action.execute({ embeddable: { addNewPanel } });

    expect(addNewPanel).toHaveBeenCalledWith({
      panelType: VEGA_EMBEDDABLE_TYPE,
      serializedState: { spec: getDefaultSpec() },
    });
    expect(onEdit).toHaveBeenCalledWith({ isNewPanel: true });
  });
});
