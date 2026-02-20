/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { useDrilldownsManager } from '../context';
import { DrilldownFactoryPicker } from '../drilldown_factory_picker';
import { DrilldownManagerFooter } from '../drilldown_manager_footer';
import { DrilldownStateForm } from '../drilldown_state_form';
import { ButtonSubmit } from '../../components/button_submit';

const txtCreateDrilldown = i18n.translate(
  'embeddableApi.drilldowns.containers.createDrilldownForm.title',
  {
    defaultMessage: 'Create Drilldown',
    description: 'Drilldowns flyout title for new drilldown form.',
  }
);

const txtCreateDrilldownButton = i18n.translate(
  'embeddableApi.drilldowns.containers.createDrilldownForm.primaryButton',
  {
    defaultMessage: 'Create drilldown',
    description: 'Primary button on new drilldown creation form.',
  }
);

export const CreateDrilldownForm: React.FC = () => {
  const isMounted = useMountedState();
  const drilldowns = useDrilldownsManager();
  const drilldown = drilldowns.getDrilldownManager();
  const error = drilldown?.useError();
  const [disabled, setDisabled] = React.useState(false);

  const handleCreate = () => {
    setDisabled(true);
    drilldowns.createDrilldown().finally(() => {
      if (!isMounted()) return;
      setDisabled(false);
    });
  };

  return (
    <>
      <DrilldownManagerTitle>{txtCreateDrilldown}</DrilldownManagerTitle>
      <DrilldownFactoryPicker />
      {!!drilldown && <DrilldownStateForm drilldown={drilldown} disabled={disabled} />}
      {!!drilldown && (
        <DrilldownManagerFooter>
          <ButtonSubmit disabled={disabled || !!error} onClick={handleCreate}>
            {txtCreateDrilldownButton}
          </ButtonSubmit>
        </DrilldownManagerFooter>
      )}
    </>
  );
};
