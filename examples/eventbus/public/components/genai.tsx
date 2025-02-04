/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState, type FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { Markdown } from '@kbn/shared-ux-markdown';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

import { EsqlPopover } from './esql_popover';

export const GenAI: FC = () => {
  const state = useEventBusExampleState();
  const fullState = state.useState();
  const esql = state.useState((s) => s.esql);
  const crossfilter = state.useState((s) => s.filters);
  const selectedFields = state.useState((s) => s.selectedFields);
  // const allFields = state.useState((s) => s.allFields);
  // console.log('allFields', allFields);

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || selectedFields.length === 0) return null;

    const els = esql.split('|').map((d) => d.trim());
    Object.values(crossfilter).forEach((filter) => {
      els.splice(1, 0, `WHERE ${filter}`);
    });

    els.push(`KEEP message`);
    els.push('LIMIT 100');

    return els.join('\n| ');
  }, [crossfilter, esql, selectedFields]);

  const data = useFetchESQL(esqlWithFilters);

  const logs = React.useMemo(() => {
    if (!data) return '';
    return data.values.map((d) => d[0]).join('\n');
  }, [data]);

  // Function to call the OpenAI API
  const getOpenAIResponse = async () => {
    const apiKey = 'YOUR-API-KEY'; // Replace with your actual OpenAI API key
    const prompt = `
    You are an SRE (Site Reliability Engineer) and you speak excellent JSON. You are using Elasticsearch/Kibana with its Discover feature. You are investigating a series of logs. So far you came up with this ES|QL (Elasticsearch Query Language) to retrieve logs:

    ${esqlWithFilters}

    If it includes a WHERE clause, it means you are filtering logs based on certain conditions.
    The filter could come from a crossfilter visualization or a statistical analysis that identified the filter to stand out in the logs. It could also be based on earlier suggestions you made.

    The ES|QL populates a state, it currently looks like this:

    ${JSON.stringify(fullState)}

    The state can be manipulated by actions inspired by redux toolkit. The following actions are available (you may use them multiple times with different payloads):

    - toggleSelectedField(payload: string) => void
    - setFilter(payload: { id: 'genai_<index>', filter: string }) => void

    For setFilter, an ES|QL filter must be defined like fieldName=="value". For multiple values per field you set one filter in the format fieldName=="value1" OR fieldName=="value2". If you set a filter for a field, you must also toggle the field to be selected. You must toggle fields only once to make sure they are visible.

    Here are the logs returned by the ES|QL query:

    ${logs}

    Your investigation includes the following steps:

    - Analyze the logs and summarize the findings.
    - Define a set of next steps or actions to take based on the logs.
    - Decide if further logs investigation is necessary or if concrete actions can be taken based on the logs.

    For further logs investigation:

    - Summarize the next steps (limited by available actions) as human readable text.
    - Summarize the same next steps as machine readable using the available actions.

    For concrete actions:

    - Summarize next steps as human readable text.

    This is your JSON response schema:

    { analysisSummary: string, actionsHumanReadable: string, actionsMachineReadable?: Array<{ action: string, payload: any }> }
`;

    console.log('prompt', prompt);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          stream: true,
        }),
      });

      // Check if the response body is readable
      if (!response.body) {
        throw new Error('Readable stream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      setSummary('');
      setMessage('');

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        setIsLoading(!done);

        // Decode the chunk into a string
        const chunk = decoder.decode(value || new Uint8Array(), { stream: true });

        // Parse the streamed content (OpenAI sends chunked data with 'data: {content}')
        const lines = chunk.split('\n');
        const parsedLines = lines.map((line) => line.replace(/^data: /, '').trim()); // Clean 'data: ' part
        const contentLines = parsedLines.filter((line) => line && line !== '[DONE]'); // Filter empty and done

        // Append the actual content to the response state
        contentLines.forEach((content) => {
          try {
            const parsed = JSON.parse(content); // Parse the JSON content
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              setSummary((prev) => prev + parsed.choices[0].delta.content); // Append the content
            }
          } catch (e) {
            console.error('Failed to parse JSON:', e);
          }
        });
      }
    } catch (e) {
      setError('Error fetching OpenAI API: ' + e.message);
    }
  };

  // console.log('summary', summary);
  const genaiOutput = useMemo(() => {
    try {
      // strip ```json and ``` from beginning and end of the response
      let trimmedSummary = summary
        .replace(/^```json/, '')
        .replace(/```$/, '')
        .trim();

      // if the trimmedSummary doesn't end with a closing bracket, add it
      if (!trimmedSummary.endsWith('}')) {
        trimmedSummary += `"}`;
      }
      // console.log('trimmedSummary', trimmedSummary);
      const genaiResp = JSON.parse(trimmedSummary);
      console.log('genaiResp', genaiResp);

      let analysisSummary = '';
      let actionsHumanReadable = '';
      let actionsMachineReadable = [];

      if (genaiResp.analysisSummary) {
        analysisSummary = genaiResp.analysisSummary;
      }

      if (genaiResp.actionsHumanReadable) {
        actionsHumanReadable = genaiResp.actionsHumanReadable;
      }

      if (genaiResp.actionsMachineReadable) {
        actionsMachineReadable = genaiResp.actionsMachineReadable;
      }

      return { analysisSummary, actionsHumanReadable, actionsMachineReadable };
    } catch (e) {
      // console.log('error parsing genai response', e);
      return undefined;
    }
  }, [summary]);
  // console.log('genaiOutput', genaiOutput);

  useEffect(() => {
    if (genaiOutput && genaiOutput.analysisSummary !== '') {
      // console.log('messageUpdate', genaiOutput.messageUpdate);
      setMessage(genaiOutput.analysisSummary);
    }
  }, [genaiOutput]);

  return (
    <EuiPanel paddingSize="s" hasBorder css={{ width: '500px', position: 'relative' }}>
      {esqlWithFilters !== null && <EsqlPopover esql={esqlWithFilters} />}
      <EuiButton fill={true} color="primary" size="s" onClick={() => getOpenAIResponse()}>
        Investigate
      </EuiButton>
      <EuiSpacer size="s" />
      {error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <Markdown readOnly>{message}</Markdown>
          {genaiOutput && genaiOutput.actionsHumanReadable !== '' && (
            <>
              <EuiSpacer size="s" />
              <strong>Next steps</strong>
              <EuiSpacer size="s" />

              <Markdown readOnly>{genaiOutput.actionsHumanReadable}</Markdown>
            </>
          )}
          <EuiSpacer size="s" />
          {genaiOutput && genaiOutput.actionsMachineReadable.length > 0 && (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={true}
                  color="primary"
                  size="s"
                  onClick={() => {
                    genaiOutput.actionsMachineReadable.forEach((action) => {
                      state.actions[action.action](action.payload);
                    });
                  }}
                >
                  Continue
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      )}
    </EuiPanel>
  );
};
