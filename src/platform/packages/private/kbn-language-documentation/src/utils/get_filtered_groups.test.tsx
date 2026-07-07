/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { getFilteredGroups } from './get_filtered_groups';
import { HIGHLIGHT_TOKEN } from './highlight_matches';

describe('getFilteredGroups', () => {
  const sections = {
    groups: [
      {
        label: 'Section one',
        description: 'Section 1 description',
        items: [],
      },
      {
        label: 'Section two',
        items: [
          {
            label: 'Section two item 1 blah blah',
            description: {
              markdownContent: `## Section two item 1 description `,
            },
          },
          {
            label: 'Section two item 2',
            description: {
              markdownContent: `## Section two item 2 description `,
            },
          },
        ],
      },
      {
        label: 'Section three ',
        items: [
          {
            label: 'Section three  item 1',
            description: {
              markdownContent: `## Section three  item 1 description `,
            },
          },
          {
            label: 'Section three  item 2',
            description: {
              markdownContent: `## Section three  item 2 description `,
            },
          },
        ],
      },
    ],
    initialSection: <span>Here is the initial section</span>,
  };
  test('Should return the sections as it gets them if the search string is empty', () => {
    const filteredSections = getFilteredGroups('', false, sections);
    expect(filteredSections).toStrictEqual([
      ...sections.groups.map((group) => ({ ...group, options: group.items })),
    ]);
  });

  test('Should return the 2 last sections as it gets them if the search string is empty and the numOfGroupsToOmit is set to 1', () => {
    const filteredSections = getFilteredGroups('', false, sections, 1);
    expect(filteredSections).toStrictEqual([
      ...sections.groups.slice(1).map((group) => ({ ...group, options: group.items })),
    ]);
  });

  test('Should return the section two as it gets it if the search string is asking for this', () => {
    const filteredSections = getFilteredGroups('tWo', false, sections);
    expect(filteredSections).toStrictEqual([
      {
        ...sections.groups[1],
        label: `Section ${HIGHLIGHT_TOKEN}two${HIGHLIGHT_TOKEN}`,
        description: '',
        items: [
          {
            label: `Section ${HIGHLIGHT_TOKEN}two${HIGHLIGHT_TOKEN} item 1 blah blah`,
            description: {
              markdownContent: `## Section ${HIGHLIGHT_TOKEN}two${HIGHLIGHT_TOKEN} item 1 description `,
            },
          },
          {
            label: `Section ${HIGHLIGHT_TOKEN}two${HIGHLIGHT_TOKEN} item 2`,
            description: {
              markdownContent: `## Section ${HIGHLIGHT_TOKEN}two${HIGHLIGHT_TOKEN} item 2 description `,
            },
          },
        ],
      },
    ]);
  });

  test('Should return the section two filtered on the search string if it is allowed to search in description', () => {
    const filteredSections = getFilteredGroups('Section two item 1 blah blah', true, sections);
    expect(filteredSections).toStrictEqual([
      {
        ...sections.groups[1],
        label: 'Section two',
        description: '',
        items: [
          {
            label: `${HIGHLIGHT_TOKEN}Section two item 1 blah blah${HIGHLIGHT_TOKEN}`,
            description: {
              markdownContent: '## Section two item 1 description ',
            },
          },
        ],
      },
    ]);
  });

  test('Should prioritize items that match on label over items that match on description', () => {
    const documentation = {
      groups: [
        {
          label: 'Section one',
          description: 'Values',
          items: [],
        },
        {
          label: 'Section two',
          items: [
            {
              label: 'Section two item 1 blah blah',
              description: {
                markdownContent: 'Values',
              },
            },
            {
              label: 'Values',
              description: {
                markdownContent: `## Section two item 2 description `,
              },
            },
          ],
        },
      ],
      initialSection: <span>Here is the initial section</span>,
    };
    const filteredSections = getFilteredGroups('Values', true, documentation);
    expect(filteredSections).toStrictEqual([
      {
        ...documentation.groups[1],
        label: 'Section two',
        description: '',
        items: [
          {
            label: `${HIGHLIGHT_TOKEN}Values${HIGHLIGHT_TOKEN}`,
            description: {
              markdownContent: '## Section two item 2 description ',
            },
          },
          {
            label: 'Section two item 1 blah blah',
            description: {
              markdownContent: `${HIGHLIGHT_TOKEN}Values${HIGHLIGHT_TOKEN}`,
            },
          },
        ],
      },
    ]);
  });
});
