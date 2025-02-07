/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ComponentMeta } from '@storybook/react';
import React, { EventHandler, FC, MouseEvent, useState, useEffect } from 'react';
import { of } from 'rxjs';

import {
  EuiButton,
  EuiCollapsibleNavBeta,
  EuiCollapsibleNavBetaProps,
  EuiHeader,
  EuiHeaderSection,
  EuiPageTemplate,
} from '@elastic/eui';

import type { NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';
import { NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import type { NavigationServices } from '../types';
import { NavigationProvider } from '../services';
import { Navigation } from './navigation';

const storybookMock = new NavigationStorybookMock();

interface Props {
  clickAction?: EventHandler<MouseEvent>;
  clickActionText?: string;
  children?: React.ReactNode | (({ isCollapsed }: { isCollapsed: boolean }) => React.ReactNode);
}

const NavigationWrapper: FC<Props & Omit<Partial<EuiCollapsibleNavBetaProps>, 'children'>> = (
  props
) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onCollapseToggle = (nextIsCollapsed: boolean) => {
    setIsCollapsed(nextIsCollapsed);
  };

  useEffect(() => {
    // Set padding to body to avoid unnecessary scrollbars
    document.body.style.paddingTop = '0px';
    document.body.style.paddingRight = '0px';
    document.body.style.paddingBottom = '0px';
  }, []);

  return (
    <>
      <EuiHeader position="fixed">
        <EuiHeaderSection side={props?.side}>
          <EuiCollapsibleNavBeta
            {...props}
            children={
              typeof props.children === 'function'
                ? props.children({ isCollapsed })
                : props.children
            }
            initialIsCollapsed={isCollapsed}
            onCollapseToggle={onCollapseToggle}
            css={
              props.css ?? {
                overflow: 'visible',
                clipPath: 'polygon(0 0, 300% 0, 300% 100%, 0 100%)',
              }
            }
          />
        </EuiHeaderSection>
      </EuiHeader>
      <EuiPageTemplate>
        <EuiPageTemplate.Section>
          {props.clickAction ? (
            <EuiButton color="text" onClick={props.clickAction}>
              {props.clickActionText ?? 'Click me'}
            </EuiButton>
          ) : (
            <p>Hello world</p>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};

const navigationTreeWithGroups: NavigationTreeDefinitionUI = {
  id: 'es',
  body: [
    // My custom project
    {
      id: 'example_project',
      path: 'example_project',
      title: 'Solution name',
      isCollapsible: false,
      icon: 'logoElastic',
      children: [
        {
          id: 'item1',
          path: 'example_project.item1',
          title: 'Item 01',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item2',
          path: 'example_project.item2',
          title: 'Item 02',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'section1',
          path: 'example_project.section1',
          title: 'Section one',
          children: [
            {
              id: 'item1',
              path: 'example_project.section1.item1',
              title: 'Item 03',
              icon: 'iInCircle',
              renderAs: 'panelOpener',
              children: [
                // FIXME: group mixed with items causes crash
                // {
                //   id: 'sub1',
                //   path: 'example_project.section1.item1.sub1',
                //   title: 'Item 11',
                //   href: '/app/kibana',
                //   icon: 'iInCircle',
                // },
                // {
                //   id: 'sub2',
                //   path: 'example_project.section1.item1.sub2',
                //   title: 'Item 12',
                //   href: '/app/kibana',
                //   icon: 'iInCircle',
                // },
                // {
                //   id: 'sub3',
                //   path: 'example_project.section1.item1.sub3',
                //   title: 'Item 13',
                //   href: '/app/kibana',
                //   icon: 'iInCircle',
                // },
                {
                  id: 'section1',
                  path: 'example_project.section1.item1.section1',
                  title: 'Section one',
                  children: [
                    {
                      id: 'sub1',
                      path: 'example_project.section1.item1.section1.sub1',
                      title: 'Item 14',
                      href: '/app/kibana',
                      icon: 'iInCircle',
                    },
                    {
                      id: 'sub2',
                      path: 'example_project.section1.item1.section1.sub2',
                      title: 'Item 15',
                      href: '/app/kibana',
                      icon: 'iInCircle',
                    },
                    {
                      id: 'sub3',
                      path: 'example_project.section1.item1.section1.sub3',
                      title: 'Item 16',
                      href: '/app/kibana',
                      icon: 'iInCircle',
                    },
                  ],
                },
                {
                  id: 'section2',
                  path: 'example_project.section1.item1.section2',
                  title: 'Section two',
                  children: [
                    {
                      id: 'sub1',
                      path: 'example_project.section1.item1.section2.sub1',
                      title: 'Item 17',
                      href: '/app/kibana',
                      icon: 'iInCircle',
                    },
                    {
                      id: 'sub2',
                      path: 'example_project.section1.item1.section2.sub2',
                      title: 'Just if we want to bring back those icons at some point',
                      href: '/app/kibana',
                      icon: 'dashboardApp',
                    },
                    {
                      id: 'sub3',
                      path: 'example_project.section1.item1.section2.sub3',
                      title: 'Item 18',
                      href: '/app/kibana',
                      icon: 'iInCircle',
                    },
                  ],
                },
                {
                  id: 'section2',
                  path: 'example_project.section1.item1.section2',
                  title: 'Item 19',
                  icon: 'iInCircle',
                  renderAs: 'accordion',
                  children: [
                    {
                      id: 'sub1',
                      path: 'example_project.section1.item1.section2.sub1',
                      title: 'Item-Beta',
                      href: '/app/kibana',
                    },
                    {
                      id: 'sub2',
                      path: 'example_project.section1.item1.section2.sub2',
                      title: 'Item-Labs',
                      href: '/app/kibana',
                    },
                  ],
                },
                {
                  id: 'section3',
                  title: 'Parent item, opened',
                  path: 'example_project.section1.item1.section3',
                  icon: 'iInCircle',
                  renderAs: 'accordion',
                  children: [
                    {
                      id: 'sub1',
                      path: 'example_project.section1.item1.section3.sub1',
                      title: 'Item 20',
                      href: '/app/kibana',
                    },
                    {
                      id: 'sub2',
                      path: 'example_project.section1.item1.section3.sub2',
                      title: 'Item 21',
                      href: '/app/kibana',
                    },
                    {
                      id: 'sub3',
                      path: 'example_project.section1.item1.section3.sub3',
                      title: 'Item 22',
                      href: '/app/kibana',
                    },
                  ],
                },
              ],
            },
            {
              id: 'item2',
              path: 'example_project.section1.item2',
              title: 'Item 04',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
            {
              id: 'item3',
              title: 'Item 05',
              path: 'example_project.section1.item3',
              icon: 'iInCircle',
              renderAs: 'panelOpener',
              children: [
                {
                  id: 'sub1',
                  path: 'example_project.section1.item3.sub1',
                  title: 'Item 23',
                  href: '/app/kibana',
                  icon: 'iInCircle',
                },
              ],
            },
          ],
        },
        {
          id: 'section2',
          title: 'Section two',
          path: 'example_project.section2',
          children: [
            {
              id: 'item1',
              icon: 'iInCircle',
              title: 'Item 06',
              path: 'example_project.section2.item1',
              renderAs: 'panelOpener',
              children: [
                {
                  id: 'sub1',
                  path: 'example_project.section2.item1.sub1',
                  title: 'Item 24',
                  href: '/app/kibana',
                  icon: 'iInCircle',
                },
              ],
            },
            {
              id: 'item2',
              path: 'example_project.section2.item2',
              title: 'Item 07',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
            {
              id: 'item3',
              path: 'example_project.section2.item3',
              title: 'Item 08',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
          ],
        },
        {
          id: 'section3',
          title: 'Standalone item with long name',
          path: 'example_project.section3',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'section3',
          title: 'Standalone group item with long name',
          path: 'example_project.section3',
          icon: 'iInCircle',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'item1',
              path: 'example_project.section3.item1',
              title: 'Item 25',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
            {
              id: 'item2',
              path: 'example_project.section3.item2',
              title: 'Item 26',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
            {
              id: 'item3',
              path: 'example_project.section3.item3',
              title: 'Item 27',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
          ],
        },
        {
          id: 'section4',
          title: 'Item 09',
          path: 'example_project.section4',
          renderAs: 'accordion',
          icon: 'iInCircle',
          children: [
            {
              id: 'item1',
              path: 'example_project.section4.item1',
              title: 'Item-Beta',
              href: '/app/kibana',
              withBadge: true, // FIXME: show "beta" badge in circle
            },
            {
              id: 'item2',
              path: 'example_project.section4.item2',
              title: 'Item-Labs',
              href: '/app/kibana',
              withBadge: true, // FIXME: show "beaker" badge
            },
            {
              id: 'item3',
              path: 'example_project.section4.item3',
              title: 'Item 27 - name plus badge & icon',
              renderAs: 'panelOpener',
              children: [
                {
                  id: 'sub1',
                  path: 'example_project.section4.item3.sub1',
                  title: 'Item 28',
                  href: '/app/kibana',
                  icon: 'iInCircle',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      id: 'section5',
      title: 'Parent item, closed',
      path: 'footer.section5',
      renderAs: 'accordion',
      icon: 'iInCircle',
      children: [
        {
          id: 'item1',
          path: 'footer.section5.item1',
          title: 'Item 29',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item2',
          path: 'footer.section5.item2',
          title: 'Item 30',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item3',
          path: 'footer.section5.item3',
          title: 'Item 31',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item4',
          icon: 'iInCircle',
          title: 'Sub-Accordion',
          path: 'footer.section5.item4',
          renderAs: 'accordion',
          children: [
            {
              id: 'sub1',
              path: 'footer.section5.item4.sub1',
              title: 'Item 32',
              href: '/app/kibana',
              icon: 'iInCircle',
            },
          ],
        },
      ],
    },
    {
      id: 'item1',
      path: 'footer.item1',
      title: 'Item 10',
      icon: 'iInCircle',
      href: '/app/kibana',
    },
    {
      id: 'section6',
      title: 'Parent item, opened',
      path: 'footer.section6',
      renderAs: 'accordion',
      icon: 'iInCircle',
      defaultIsCollapsed: false,
      children: [
        {
          id: 'item1',
          path: 'footer.section6.item1',
          title: 'Item 33',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item2',
          path: 'footer.section6.item2',
          title: 'Item 34',
          href: '/app/kibana',
          icon: 'iInCircle',
        },
        {
          id: 'item3',
          path: 'footer.section6.item3',
          title: 'Item 35',
          href: '/app/kibana',
          icon: 'iInCircle',
          openInNewTab: true, // FIXME: show "popout" icon aligned to the right
        },
      ],
    },
  ],
};

export const GeneralLayoutStructure = (args: NavigationServices) => {
  const services = storybookMock.getServices(args);

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation navigationTree$={of(navigationTreeWithGroups)} />
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

export default {
  title: 'Chrome/Navigation',
  description: 'Navigation container to render items for cross-app linking',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  component: GeneralLayoutStructure,
} as ComponentMeta<typeof GeneralLayoutStructure>;
