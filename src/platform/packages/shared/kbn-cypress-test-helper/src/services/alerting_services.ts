/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'cypress-network-idle';

const REFRESH_BUTTON = `[data-test-subj="kbnQueryBar"] [data-test-subj="querySubmitButton"]`;
const DATAGRID_CHANGES_IN_PROGRESS = '[data-test-subj="body-data-grid"] .euiProgress';
const EVENT_CONTAINER_TABLE_LOADING = '[data-test-subj="internalAlertsPageLoading"]';
const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';
const EMPTY_ALERT_TABLE = '[data-test-subj="alertsTableEmptyState"]';
const ALERTS_TABLE_COUNT = `[data-test-subj="toolbar-alerts-count"]`;
const DETECTION_PAGE_FILTER_GROUP_WRAPPER = '.filter-group__wrapper';
const DETECTION_PAGE_FILTERS_LOADING = '.securityPageWrapper .controlFrame--controlLoading';
const DETECTION_PAGE_FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';
const OPTION_LISTS_LOADING = '.optionsList--filterBtnWrapper .euiLoadingSpinner';
const ALERTS_URL = '/app/security/alerts';

const refreshPage = () => {
  cy.get(REFRESH_BUTTON).click({ force: true });
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
};

const waitForPageFilters = () => {
  cy.log('Waiting for Page Filters');
  cy.url().then((urlString) => {
    const url = new URL(urlString);
    if (url.pathname.endsWith(ALERTS_URL)) {
      // since these are only valid on the alert page
      cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
      cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
      cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
      cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
    } else {
      cy.log('Skipping Page Filters Wait');
    }
  });
};

const waitForAlerts = () => {
  waitForPageFilters();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(DATAGRID_CHANGES_IN_PROGRESS).should('not.be.true');
  cy.get(EVENT_CONTAINER_TABLE_LOADING).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.waitForNetworkIdle('/internal/search/privateRuleRegistryAlertsSearchStrategy', 500);
};

export const waitForAlertsToPopulate = (alertCountThreshold = 1) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for alerts to appear');
      refreshPage();
      cy.get([EMPTY_ALERT_TABLE, ALERTS_TABLE_COUNT].join(', '));
      return cy.root().then(($el) => {
        const emptyTableState = $el.find(EMPTY_ALERT_TABLE);
        if (emptyTableState.length > 0) {
          cy.log('Table is empty', emptyTableState.length);
          return false;
        }
        const countEl = $el.find(ALERTS_TABLE_COUNT);
        const alertCount = parseInt(countEl.text(), 10) || 0;
        return alertCount >= alertCountThreshold;
      });
    },
    { interval: 500, timeout: 30000 }
  );
  waitForAlerts();
};
