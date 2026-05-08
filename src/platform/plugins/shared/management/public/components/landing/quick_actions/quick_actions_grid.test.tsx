/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QuickActionsGrid } from './quick_actions_grid';
import {
  INDEX_CREATE_LANDING_OVERLAY_ID,
  ALERTING_RULE_CREATE_LANDING_OVERLAY_ID,
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  QUICK_ACTION_DEFINITIONS,
  CONNECTORS_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  USER_CREATE_LANDING_OVERLAY_ID,
} from './quick_action_definitions';

function buildCapabilities(
  enabled: string[]
): Record<string, Record<string, Record<string, boolean>>> {
  const caps: Record<string, Record<string, Record<string, boolean>>> = { management: {} };
  for (const path of enabled) {
    const [, section, appId] = path.split('.');
    if (!caps.management[section]) {
      caps.management[section] = {};
    }
    caps.management[section][appId] = true;
  }
  return caps;
}

describe('QuickActionsGrid', () => {
  const navigateToApp = jest.fn();
  const onOpenLandingOverlay = jest.fn();

  afterEach(() => {
    navigateToApp.mockClear();
    onOpenLandingOverlay.mockClear();
  });

  it('renders CTA title and helper description on quick action cards', () => {
    const caps = buildCapabilities(['management.insightsAndAlerting.reporting']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementQuickAction-reporting')).toBeInTheDocument();
    expect(screen.getByText(/View reporting and exports/i)).toBeInTheDocument();
    expect(screen.getByText(/Download PDF, CSV/i)).toBeInTheDocument();
  });

  it('renders cards for actions the user has capabilities for', () => {
    const caps = buildCapabilities([
      'management.data.index_management',
      'management.security.api_keys',
    ]);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementQuickAction-create_index')).toBeInTheDocument();
    expect(screen.getByTestId('managementQuickAction-api_keys')).toBeInTheDocument();
    expect(screen.queryByTestId('managementQuickAction-reporting')).not.toBeInTheDocument();
  });

  it('shows create index quick action when only Elasticsearch index_management feature capabilities are set', () => {
    const caps = {
      management: {
        insightsAndAlerting: { triggersActions: true, reporting: true },
        data: {},
      },
      index_management: {
        monitor: true,
        manageEnrich: false,
        monitorEnrich: false,
        manageIndexTemplates: false,
      },
    };

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementQuickAction-create_index')).toBeInTheDocument();
    expect(screen.getByTestId('managementQuickAction-alerting_rules')).toBeInTheDocument();
    expect(screen.getByTestId('managementQuickAction-reporting')).toBeInTheDocument();
  });

  it('renders nothing when user has no management capabilities', () => {
    const { container } = render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={{} as any}
          navigateToApp={navigateToApp}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls navigateToApp with path on card click when no overlay is registered', () => {
    const caps = buildCapabilities(['management.kibana.indexPatterns']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-data_views'));

    const dataViewDef = QUICK_ACTION_DEFINITIONS.find((d) => d.id === 'data_views')!;
    expect(navigateToApp).toHaveBeenCalledWith(dataViewDef.appId, {
      path: dataViewDef.path,
    });
  });

  it('opens landing overlay when registered for create index', () => {
    const caps = buildCapabilities(['management.data.index_management']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-create_index'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(INDEX_CREATE_LANDING_OVERLAY_ID);
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(INDEX_CREATE_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('falls back to navigate when create index overlay is not registered', () => {
    const caps = buildCapabilities(['management.data.index_management']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={jest.fn(() => undefined)}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-create_index'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'data/index_management',
    });
    expect(onOpenLandingOverlay).not.toHaveBeenCalled();
  });

  it('opens landing overlay when registered for connectors', () => {
    const caps = buildCapabilities(['management.insightsAndAlerting.triggersActionsConnectors']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-connectors'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(CONNECTORS_LANDING_OVERLAY_ID);
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(CONNECTORS_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('opens landing overlay when registered for data views', () => {
    const caps = buildCapabilities(['management.kibana.indexPatterns']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-data_views'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(DATA_VIEWS_CREATE_LANDING_OVERLAY_ID);
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(DATA_VIEWS_CREATE_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('opens landing overlay when registered for api keys', () => {
    const caps = buildCapabilities(['management.security.api_keys']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-api_keys'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(API_KEYS_CREATE_LANDING_OVERLAY_ID);
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(API_KEYS_CREATE_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('opens landing overlay when registered for add user', () => {
    const caps = buildCapabilities(['management.security.users']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-users'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(USER_CREATE_LANDING_OVERLAY_ID);
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(USER_CREATE_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('falls back to navigate when add user overlay is not registered', () => {
    const caps = buildCapabilities(['management.security.users']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={jest.fn(() => undefined)}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-users'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'security/users/create',
    });
    expect(onOpenLandingOverlay).not.toHaveBeenCalled();
  });

  it('opens landing overlay when registered for alerting rules', () => {
    const caps = buildCapabilities(['management.insightsAndAlerting.triggersActions']);

    const getLandingQuickActionOverlay = jest.fn().mockReturnValue(() => <div />);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={getLandingQuickActionOverlay}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-alerting_rules'));
    expect(getLandingQuickActionOverlay).toHaveBeenCalledWith(
      ALERTING_RULE_CREATE_LANDING_OVERLAY_ID
    );
    expect(onOpenLandingOverlay).toHaveBeenCalledWith(ALERTING_RULE_CREATE_LANDING_OVERLAY_ID);
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('falls back to navigate when alerting rules overlay is not registered', () => {
    const caps = buildCapabilities(['management.insightsAndAlerting.triggersActions']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={jest.fn(() => undefined)}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-alerting_rules'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'insightsAndAlerting/triggersActions',
    });
    expect(onOpenLandingOverlay).not.toHaveBeenCalled();
  });

  it('falls back to navigate when connectors overlay is not registered', () => {
    const caps = buildCapabilities(['management.insightsAndAlerting.triggersActionsConnectors']);

    render(
      <I18nProvider>
        <QuickActionsGrid
          capabilities={caps as any}
          navigateToApp={navigateToApp}
          getLandingQuickActionOverlay={jest.fn(() => undefined)}
          onOpenLandingOverlay={onOpenLandingOverlay}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementQuickAction-connectors'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
    });
    expect(onOpenLandingOverlay).not.toHaveBeenCalled();
  });
});
