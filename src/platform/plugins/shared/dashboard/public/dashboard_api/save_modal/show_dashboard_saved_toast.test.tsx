/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { of, type Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';
import { coreServices } from '../../services/kibana_services';
import { showDashboardSavedToast } from './show_dashboard_saved_toast';

const setCurrentAppId = (appId: string | undefined) => {
  (coreServices.application as { currentAppId$: Observable<string | undefined> }).currentAppId$ =
    of<string | undefined>(appId);
};

const getLastToastInput = () => {
  const calls = (coreServices.notifications.toasts.addSuccess as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as { title: string; text?: MountPoint };
};

describe('showDashboardSavedToast', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setCurrentAppId(DASHBOARD_APP_ID);
  });

  it('omits the link when in the Dashboard app', async () => {
    await showDashboardSavedToast({
      savedDashboardId: 'abc-123',
      dashboardTitle: 'Dash Title',
    });

    expect(getLastToastInput()).toEqual(
      expect.objectContaining({
        title: `Dashboard 'Dash Title' was saved`,
        text: undefined,
        'data-test-subj': 'saveDashboardSuccess',
      })
    );
  });

  it('renders a link when the user is outside the Dashboard app', async () => {
    setCurrentAppId('agentBuilder');

    await showDashboardSavedToast({
      savedDashboardId: 'abc-123',
      dashboardTitle: 'Dash Title',
    });

    expect(getLastToastInput().text).toBeDefined();
  });

  it('interpolates the dashboard title into the toast title', async () => {
    await showDashboardSavedToast({
      savedDashboardId: 'abc',
      dashboardTitle: 'My Dashboard',
    });

    expect(getLastToastInput().title).toBe(`Dashboard 'My Dashboard' was saved`);
  });

  it('navigates to the saved dashboard when the link is clicked', async () => {
    setCurrentAppId('agentBuilder');

    await showDashboardSavedToast({
      savedDashboardId: 'saved-id',
      dashboardTitle: 'Dash Title',
    });

    // `toMountPoint` exposes the original React node via `__reactMount__` outside of
    // production builds (see @kbn/react-kibana-mount/to_mount_point). This is the
    // same escape hatch used by Kibana's react_mount_serializer in @kbn/test, and
    // lets us reach the rendered button without mounting it. We rely on it here
    // because Kibana's custom Jest resolver rewrites `@kbn/...` requests to
    // absolute paths, which prevents `jest.mock('@kbn/react-kibana-mount', ...)`
    // from binding inside the dashboard plugin's test setup.
    const mount = getLastToastInput().text as MountPoint & {
      __reactMount__: ReactElement;
    };
    // The rendered tree is <EuiFlexGroup><EuiFlexItem><EuiButton>...; the button
    // sits two levels down. Walk into the children to reach its onClick.
    const flexItem = (mount.__reactMount__.props as { children: ReactElement }).children;
    const button = (flexItem.props as { children: ReactElement<{ onClick: () => void }> }).children;
    button.props.onClick();

    expect(coreServices.application.navigateToApp).toHaveBeenCalledWith(DASHBOARD_APP_ID, {
      path: '#/view/saved-id',
    });
  });
});
