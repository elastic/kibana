/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFieldText,
  EuiTextArea,
  EuiCodeEditor,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useConsoleAutocomplete } from '../hooks/use_console_autocomplete';

export interface InternalConnectorStep {
  type: 'elasticsearch.request' | 'kibana.request';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

interface InternalConnectorEditorProps {
  value: InternalConnectorStep;
  onChange: (value: InternalConnectorStep) => void;
  disabled?: boolean;
}

export const InternalConnectorEditor: React.FC<InternalConnectorEditorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { getSuggestions } = useConsoleAutocomplete();

  const handlePathChange = async (path: string) => {
    const newValue = { ...value, path };
    onChange(newValue);

    // Get autocomplete suggestions
    if (path.length > 0) {
      try {
        const suggestions = await getSuggestions({
          currentPath: 'path',
          cursorPosition: path.length,
          currentValue: path,
          apiType: value.type,
        });
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.warn('Failed to get autocomplete suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange({ ...value, path: suggestion });
    setShowSuggestions(false);
  };

  const getApiTypeOptions = () => [
    { value: 'elasticsearch.request', text: 'Elasticsearch API' },
    { value: 'kibana.request', text: 'Kibana API' },
  ];

  const getMethodOptions = () => [
    { value: 'GET', text: 'GET' },
    { value: 'POST', text: 'POST' },
    { value: 'PUT', text: 'PUT' },
    { value: 'DELETE', text: 'DELETE' },
    { value: 'HEAD', text: 'HEAD' },
    { value: 'OPTIONS', text: 'OPTIONS' },
  ];

  const getCommonPaths = () => {
    if (value.type === 'elasticsearch.request') {
      return [
        '/_search',
        '/_cat/indices',
        '/_cluster/health',
        '/_nodes/stats',
        '/{index}/_doc',
        '/{index}/_search',
      ];
    } else {
      return [
        'api/kibana/settings',
        'api/saved_objects',
        'api/spaces/space',
        'api/workflows',
        'api/index_patterns/index_pattern',
        'api/alerting/rule',
      ];
    }
  };

  return (
    <EuiPanel paddingSize="m">
      <EuiTitle size="s">
        <h3>
          <EuiIcon type="link" /> Internal Connector Configuration
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        Configure an internal API request to Elasticsearch or Kibana
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="API Type" isInvalid={false} error={[]}>
            <EuiSelect
              value={value.type}
              onChange={(e) => onChange({ ...value, type: e.target.value as any })}
              options={getApiTypeOptions()}
              disabled={disabled}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="HTTP Method" isInvalid={false} error={[]}>
            <EuiSelect
              value={value.method}
              onChange={(e) => onChange({ ...value, method: e.target.value as any })}
              options={getMethodOptions()}
              disabled={disabled}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFormRow 
        label="API Path" 
        isInvalid={false} 
        error={[]}
        helpText={`Enter the ${value.type === 'elasticsearch.request' ? 'Elasticsearch' : 'Kibana'} API path`}
      >
        <div style={{ position: 'relative' }}>
          <EuiFieldText
            value={value.path}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder={value.type === 'elasticsearch.request' ? '/_search' : 'api/kibana/settings'}
            disabled={disabled}
            fullWidth
          />
          {showSuggestions && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d3dae6',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h4>Common Paths</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {getCommonPaths().map((path) => (
          <button
            key={path}
            type="button"
            style={{
              padding: '4px 8px',
              border: '1px solid #d3dae6',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            onClick={() => handleSuggestionClick(path)}
            disabled={disabled}
          >
            {path}
          </button>
        ))}
      </div>

      <EuiSpacer size="m" />

      {(value.method === 'POST' || value.method === 'PUT') && (
        <>
          <EuiFormRow 
            label="Request Body (JSON)" 
            isInvalid={false} 
            error={[]}
            helpText="Enter the request body as JSON"
          >
            <EuiCodeEditor
              value={value.body ? JSON.stringify(value.body, null, 2) : ''}
              onChange={(body) => {
                try {
                  const parsedBody = body ? JSON.parse(body) : undefined;
                  onChange({ ...value, body: parsedBody });
                } catch (error) {
                  // Don't update if JSON is invalid
                }
              }}
              language="json"
              height="200px"
              disabled={disabled}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow 
        label="Query Parameters" 
        isInvalid={false} 
        error={[]}
        helpText="Enter query parameters as key=value pairs, one per line"
      >
        <EuiTextArea
          value={value.query ? Object.entries(value.query).map(([k, v]) => `${k}=${v}`).join('\n') : ''}
          onChange={(e) => {
            const lines = e.target.value.split('\n').filter(line => line.trim());
            const query: Record<string, string> = {};
            lines.forEach(line => {
              const [key, value] = line.split('=');
              if (key && value) {
                query[key.trim()] = value.trim();
              }
            });
            onChange({ ...value, query: Object.keys(query).length > 0 ? query : undefined });
          }}
          placeholder="size=10&#10;pretty=true"
          rows={3}
          disabled={disabled}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow 
        label="Headers" 
        isInvalid={false} 
        error={[]}
        helpText="Enter headers as key=value pairs, one per line"
      >
        <EuiTextArea
          value={value.headers ? Object.entries(value.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''}
          onChange={(e) => {
            const lines = e.target.value.split('\n').filter(line => line.trim());
            const headers: Record<string, string> = {};
            lines.forEach(line => {
              const [key, value] = line.split('=');
              if (key && value) {
                headers[key.trim()] = value.trim();
              }
            });
            onChange({ ...value, headers: Object.keys(headers).length > 0 ? headers : undefined });
          }}
          placeholder="Content-Type=application/json&#10;Authorization=Bearer token"
          rows={3}
          disabled={disabled}
        />
      </EuiFormRow>
    </EuiPanel>
  );
};
