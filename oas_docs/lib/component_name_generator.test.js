/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const { createComponentNameGenerator } = require('./component_name_generator');

describe('createComponentNameGenerator', () => {
  let nameGen;
  beforeEach(() => {
    nameGen = createComponentNameGenerator();
  });

  test('generates response schema name for /api/foo/connector/{id} GET 200', () => {
    const context = {
      method: 'get',
      path: '/api/actions/connector/{id}',
      isRequest: false,
      responseCode: '200',
    };
    const name = nameGen(context);
    expect(name).toBe('ApiActionsConnector_Get_Response_200');
  });

  test('generates indexed oneOf names for /api/actions/connector GET 200', () => {
    const context = {
      method: 'get',
      path: '/api/actions/connector',
      isRequest: false,
      responseCode: '200',
    };
    const names = [];
    for (let i = 0; i < 3; i++) {
      names.push(nameGen(context, 'oneOf', i));
    }
    names.forEach((name, index) => {
      expect(name).toBe(`ApiActionsConnector_Get_Response_200_${index + 1}`);
    });
  });

  test('generates property schema names', () => {
    const context = {
      method: 'get',
      path: '/api/actions/connector/{id}',
      isRequest: false,
      responseCode: '200',
      propertyPath: ['config'],
    };
    expect(nameGen(context, 'property')).toBe('ApiActionsConnector_Get_Response_200_Config');
  });

  test('generates unique names for duplicate contexts', () => {
    const context = {
      method: 'post',
      path: '/api/test',
      isRequest: true,
    };
    expect(nameGen(context)).toBe('ApiTest_Post_Request');
    expect(nameGen(context)).toBe('ApiTest_Post_Request_1');
  });

  test('derives operation ID from path when not provided', () => {
    const context = {
      method: 'get',
      path: '/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute',
      isRequest: false,
      responseCode: '200',
    };
    expect(nameGen(context)).toBe('ApiAlertingRuleAlertUnmute_Get_Response_200');
  });

  test('handles complex path with multiple parameters and underscores', () => {
    const context = {
      method: 'post',
      path: '/api/security/role/{role_name}/field_security/{field_name}',
      isRequest: true,
    };
    expect(nameGen(context)).toBe('ApiSecurityRoleFieldSecurity_Post_Request');
  });

  test('handles array item composition type', () => {
    const context = {
      method: 'get',
      path: '/api/cases',
      isRequest: false,
      responseCode: '200',
      propertyPath: ['items'],
    };
    const name = nameGen(context, 'arrayItem');
    expect(name).toBe('ApiCases_Get_Response_200_Items_Item');
  });

  test('handles additional properties composition type', () => {
    const context = {
      method: 'get',
      path: '/api/dashboard/{id}',
      isRequest: false,
      responseCode: '200',
      propertyPath: ['metadata'],
    };
    const name = nameGen(context, 'additionalProperty');
    expect(name).toBe('ApiDashboard_Get_Response_200_Metadata_Value');
  });

  test('handles allOf composition type with index', () => {
    const context = {
      method: 'patch',
      path: '/api/fleet/agents',
      isRequest: true,
    };
    const name1 = nameGen(context, 'allOf', 0);
    const name2 = nameGen(context, 'allOf', 1);
    expect(name1).toBe('ApiFleetAgents_Patch_Request_1');
    expect(name2).toBe('ApiFleetAgents_Patch_Request_2');
  });

  test('handles nested property paths', () => {
    const context = {
      method: 'put',
      path: '/api/saved_objects/{type}/{id}',
      isRequest: false,
      responseCode: '200',
      propertyPath: ['attributes', 'visualization', 'visState'],
    };
    const name = nameGen(context, 'property');
    expect(name).toBe('ApiSavedObjects_Put_Response_200_Attributes_Visualization_VisState');
  });
});
