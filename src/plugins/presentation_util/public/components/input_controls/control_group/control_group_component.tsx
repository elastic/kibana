/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';
import classNames from 'classnames';
import { OptionsListEmbeddable, OptionsListEmbeddableFactory } from '../control_types/options_list';
import { FlightField, flightFieldLabels } from '../__stories__/flights';
import { ControlFrame } from './control_frame/control_frame';

import './control_group.scss';
import {
  InputControlMeta,
  ManageControlGroupComponent,
} from './control_group_editor/manage_control_group_component';

interface OptionsListStorybookArgs {
  fields: string[];
  twoLine: boolean;
  embeddableFactory: OptionsListEmbeddableFactory;
}

interface InputControlEmbeddableMap {
  [key: string]: OptionsListEmbeddable;
}

export const ControlGroupComponent = ({
  fields,
  twoLine,
  embeddableFactory,
}: OptionsListStorybookArgs) => {
  const [embeddablesMap, setEmbeddablesMap] = useState<InputControlEmbeddableMap>({});
  const [controlMeta, setControlMeta] = useState<InputControlMeta[]>([]);

  useEffect(() => {
    const embeddableCreatePromises = fields.map((field) => {
      return embeddableFactory.create({
        field,
        id: uuid.v4(),
        indexPattern: '',
        multiSelect: true,
        twoLineLayout: twoLine,
        title: flightFieldLabels[field as FlightField],
      });
    });
    Promise.all(embeddableCreatePromises).then((newEmbeddables) => {
      setEmbeddablesMap(
        newEmbeddables.reduce<InputControlEmbeddableMap>(
          (map, embeddable) => ((map[embeddable.id] = embeddable), map),
          {}
        )
      );
      setControlMeta(
        newEmbeddables.map((embeddable) => ({
          title: embeddable.getTitle(),
          embeddableId: embeddable.id,
          width: 'auto',
          grow: true,
        }))
      );
    });
  }, [fields, embeddableFactory, twoLine]);

  return (
    <>
      <ManageControlGroupComponent controlMeta={controlMeta} setControlMeta={setControlMeta} />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" wrap={true} gutterSize={'s'}>
        {controlMeta.map(({ embeddableId, width }) => (
          <EuiFlexItem
            grow={width === 'auto'}
            key={embeddableId}
            className={classNames({
              'controlFrame--wrapper-small': width === 'small',
              'controlFrame--wrapper-medium': width === 'medium',
              'controlFrame--wrapper-large': width === 'large',
            })}
          >
            <ControlFrame twoLine={twoLine} embeddable={embeddablesMap[embeddableId]} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
