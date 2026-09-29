/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_ATTR } from '../constants';
import { mockLayout, query, renderPage } from '../test_helpers';
import type { ElementAnchor } from '../types';
import {
  buildAnchor,
  buildCssPath,
  getAnchorPoint,
  isExposed,
  isInTooltip,
  looksGenerated,
  placeAnchor,
  promoteToCommentable,
  resolveAnchor,
  tooltipAt,
  tooltipShowing,
  triggerOf,
} from './anchor';

const bySubj = (subj: string): Element => query(`[data-test-subj="${subj}"]`);

describe('anchor', () => {
  mockLayout();

  it('flags generated ids', () => {
    expect(looksGenerated('generated-id-1a2b3c4d-5e6f')).toBe(true);
    expect(looksGenerated('i1234abcd')).toBe(true);
    expect(looksGenerated('EuiPageTemplateInner:r67:')).toBe(true);
    expect(looksGenerated('EuiPageTemplateInner«r67»')).toBe(true);
    expect(looksGenerated('saveButton')).toBe(false);
    expect(looksGenerated('step-2')).toBe(false);
  });

  it('promotes content to the nearest semantic element', () => {
    renderPage(`<button data-test-subj="save"><span><svg><path></path></svg></span></button>`);

    expect(promoteToCommentable(query('path'))).toBe(query('svg'));
    expect(promoteToCommentable(query('span'))).toBe(bySubj('save'));
  });

  it('collects every locator that identifies the element uniquely, most stable first', () => {
    renderPage(`
      <div data-test-subj="ruleForm">
        <button id="save" data-test-subj="saveButton" aria-label="Save rule">Save</button>
      </div>
    `);

    const anchor = buildAnchor(bySubj('saveButton'), { point: { x: 35, y: 15 } });

    expect(anchor.relativeX).toBeCloseTo(0.25);
    expect(anchor.relativeY).toBeCloseTo(0.25);
    expect(anchor.locators).toEqual([
      { type: 'testSubj', path: 'saveButton' },
      { type: 'id', value: 'save' },
      { type: 'ariaLabel', value: 'Save rule' },
      { type: 'text', tag: 'button', value: 'Save' },
      {
        type: 'cssPath',
        selector: '[data-test-subj="ruleForm"] > button',
        fingerprint: 'button|Save rule',
      },
    ]);
  });

  it('extends the test subject chain when the leaf is ambiguous', () => {
    renderPage(`
      <div data-test-subj="rowA"><button data-test-subj="delete">Delete</button></div>
      <div data-test-subj="rowB"><button data-test-subj="delete">Delete</button></div>
    `);

    const { locators } = buildAnchor(query('[data-test-subj="rowB"] button'));

    expect(locators[0]).toEqual({ type: 'testSubj', path: 'rowB > delete' });
    expect(locators.some((locator) => locator.type === 'text')).toBe(false);
  });

  it('skips generated ids and falls back to a structural path with a fingerprint', () => {
    renderPage(`
      <div id="panel">
        <span>Status</span>
        <span id="generated-1a2b3c4d-5e6f">Ready</span>
      </div>
    `);

    const { locators } = buildAnchor(query('#generated-1a2b3c4d-5e6f'));

    expect(locators.some((locator) => locator.type === 'id')).toBe(false);
    expect(locators[locators.length - 1]).toEqual({
      type: 'cssPath',
      selector: '[id="panel"] > span:nth-of-type(2)',
      fingerprint: 'span|Ready',
    });
  });

  it('builds structural paths from the nearest stable ancestor, or from the given root', () => {
    renderPage(`<div data-test-subj="table"><div><p>a</p><p>b</p></div></div>`);
    const element = document.querySelectorAll('p')[1];

    expect(buildCssPath(element)).toBe('[data-test-subj="table"] > div > p:nth-of-type(2)');
    expect(buildCssPath(element, bySubj('table'))).toBe('div > p:nth-of-type(2)');
  });

  it('does not start structural paths from an ancestor that is repeated in the document', () => {
    renderPage(`
      <main id="content">
        <div data-test-subj="row"><p>first</p></div>
        <div data-test-subj="row"><p>second</p></div>
      </main>
    `);

    expect(buildCssPath(document.querySelectorAll('p')[1])).toBe(
      '[id="content"] > div:nth-of-type(2) > p'
    );
  });

  it('leaves out labels longer than hosts store', () => {
    renderPage(`<button aria-label="${'x'.repeat(300)}">Go</button>`);

    const { locators } = buildAnchor(query('button'));

    expect(locators.some((locator) => locator.type === 'ariaLabel')).toBe(false);
    expect(locators.some((locator) => locator.type === 'text')).toBe(true);
  });

  it('resolves the first locator matching exactly one visible element', () => {
    renderPage(`
      <button id="save" data-rect="0,0,0,0">Save</button>
      <button aria-label="Save rule">Save</button>
      <button>Twice</button><button>Twice</button>
    `);

    const resolved = resolveAnchor({
      locators: [
        { type: 'id', value: 'save' },
        { type: 'ariaLabel', value: 'Save rule' },
      ],
      relativeX: 0.5,
      relativeY: 0.5,
    });
    expect(resolved?.element).toBe(query('[aria-label="Save rule"]'));
    expect(resolved?.exact).toBe(true);

    expect(
      resolveAnchor({
        locators: [{ type: 'text', tag: 'button', value: 'Twice' }],
        relativeX: 0.5,
        relativeY: 0.5,
      })
    ).toBeNull();
  });

  it('marks structural matches with a changed fingerprint as inexact', () => {
    renderPage(`<div id="panel"><span>Something else</span></div>`);

    const resolved = resolveAnchor({
      locators: [{ type: 'cssPath', selector: '[id="panel"] > span', fingerprint: 'span|Ready' }],
      relativeX: 0.5,
      relativeY: 0.5,
    });

    expect(resolved?.element).toBe(query('span'));
    expect(resolved?.exact).toBe(false);
  });

  it('treats a structural path matching several elements as a miss', () => {
    renderPage(`
      <div id="list">
        <div data-test-subj="item"><span>Ready</span></div>
        <div data-test-subj="item"><span>Ready</span></div>
        <div data-test-subj="item"><span>Other</span></div>
      </div>
    `);
    const at = (fingerprint: string) =>
      resolveAnchor({
        locators: [{ type: 'cssPath', selector: '[data-test-subj="item"] > span', fingerprint }],
        relativeX: 0.5,
        relativeY: 0.5,
      });

    // Two candidates carry the recorded content: neither is a safe pick.
    expect(at('span|Ready')).toBeNull();
    // A single candidate with the recorded content wins over the others.
    expect(at('span|Other')?.element).toBe(document.querySelectorAll('span')[2]);
    // Without the content anywhere, only a lone structural match is accepted.
    expect(at('span|Gone')).toBeNull();
  });

  describe('pin position', () => {
    const chart = `
      <svg data-test-subj="chart" data-rect="0,0,1000,300">
        <g>
          <rect data-rect="100,200,20,100"></rect>
          <rect data-test-subj="bar" data-rect="500,150,20,150"></rect>
        </g>
      </svg>
    `;
    const anchorBar = () =>
      buildAnchor(bySubj('chart'), { point: { x: 510, y: 225 }, hit: bySubj('bar') });

    it('records the innermost element under the pointer relative to the anchored element', () => {
      renderPage(chart);

      const anchor = anchorBar();

      expect(anchor.relativeX).toBeCloseTo(0.51);
      expect(anchor.target).toEqual({
        path: 'g > rect:nth-of-type(2)',
        fingerprint: 'rect|',
        relativeX: 0.5,
        relativeY: 0.5,
      });
    });

    it('follows the target when the layout changes and falls back to the proportional position when it is gone', () => {
      renderPage(chart);
      const anchor = anchorBar();

      renderPage(
        chart.replace('500,150,20,150', '300,150,20,150').replace('0,0,1000,300', '0,0,600,300')
      );
      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 310, y: 225 });

      renderPage(`<svg data-test-subj="chart" data-rect="0,0,1000,300"></svg>`);
      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 510, y: 225 });
    });

    it('falls back to the proportional position when the target at the path has other content', () => {
      renderPage(chart);
      const anchor = anchorBar();

      // The moved rect would put the pin at x=310 if it were still trusted.
      renderPage(
        chart.replace(
          '<rect data-test-subj="bar" data-rect="500,150,20,150"></rect>',
          '<rect data-rect="300,150,20,150"><title>Changed</title></rect>'
        )
      );

      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 510, y: 225 });
    });
  });

  describe('exposure', () => {
    const point = { x: 50, y: 50 };

    it('takes the element for shown when it, its content or an ancestor is what is drawn at the point', () => {
      renderPage(`
        <section data-rect="0,0,200,200">
          <button id="target" data-rect="0,0,100,100"><span id="label" data-rect="40,40,20,20">Go</span></button>
        </section>
      `);
      expect(isExposed(query('#label'), point)).toBe(true);
      expect(isExposed(query('#target'), point)).toBe(true);

      // Nothing of the button is drawn at the point any more; its section is.
      query('#target').setAttribute('data-rect', '0,0,0,0');
      query('#label').setAttribute('data-rect', '0,0,0,0');
      expect(isExposed(query('#target'), point)).toBe(true);
    });

    it('does not when something else is, unless that is the layer itself or the point is off screen', () => {
      renderPage(`
        <button id="target" data-rect="0,0,100,100">Go</button>
        <div id="mask" data-rect="0,0,2000,2000"></div>
      `);
      expect(isExposed(query('#target'), point)).toBe(false);
      expect(isExposed(query('#target'), { x: -50, y: 50 })).toBe(true);

      query('#mask').setAttribute(IGNORE_ATTR, 'true');
      expect(isExposed(query('#target'), point)).toBe(true);
    });

    it('takes an element hit-testing passes over, one taking no pointer input, for shown', () => {
      renderPage(`
        <button id="target" data-rect="0,0,100,100">Go</button>
        <div id="tip" role="tooltip" style="pointer-events: none" data-rect="0,0,100,100">Goes</div>
        <div id="mask" data-rect="0,0,2000,2000"></div>
      `);
      expect(isExposed(query('#target'), point)).toBe(false);
      expect(isExposed(query('#tip'), point)).toBe(true);
    });
  });

  describe('tooltips', () => {
    it('finds the tooltip showing: the one the trigger describes itself by if showing, else the latest of the rest', () => {
      renderPage(`
        <button id="described" aria-describedby="gone own"><span id="describedText">Go</span></button>
        <button id="other">Other</button>
        <div id="gone" role="tooltip" data-rect="0,0,0,0">Gone</div>
        <div id="own" role="tooltip" data-rect="0,0,100,100">Own</div>
        <div id="first" role="tooltip" data-rect="0,0,100,100"><p id="firstText">First</p></div>
        <div id="second" role="tooltip" data-rect="0,50,100,100">Second</div>
        <div id="ignored" role="tooltip" ${IGNORE_ATTR}="true" data-rect="0,0,300,300">Layer</div>
      `);
      expect(isInTooltip(query('#firstText'))).toBe(true);
      expect(isInTooltip(query('#other'))).toBe(false);

      expect(tooltipShowing(query('#describedText'))).toBe(query('#own'));
      expect(tooltipShowing(query('#other'))).toBe(query('#second'));
      query('#own').remove();
      expect(tooltipShowing(query('#described'))).toBe(query('#second'));
      query('#second').setAttribute('data-rect', '0,0,0,0');
      expect(tooltipShowing(query('#other'))).toBe(query('#first'));
      query('#first').remove();
      expect(tooltipShowing(query('#other'))).toBeNull();
    });

    it('finds the tooltip showing at a point, the latest one of several, what of it is there, and the element that shows it', () => {
      renderPage(`
        <button id="target" aria-describedby="second" data-rect="0,0,100,100">Go</button>
        <div id="hidden" role="tooltip" data-rect="0,0,0,0">Hidden</div>
        <div id="first" role="tooltip" data-rect="0,0,100,100"><p id="firstText" data-rect="0,0,100,50">First</p></div>
        <div id="second" role="tooltip" data-rect="0,50,100,100"><p id="secondText" data-rect="0,50,100,50">Second</p></div>
        <div id="ignored" role="tooltip" ${IGNORE_ATTR}="true" data-rect="0,0,300,300">Layer</div>
        <div role="tooltip" data-rect="0,0,0,0">No id</div>
      `);
      expect(tooltipAt({ x: 50, y: 25 })).toEqual({
        tooltip: query('#first'),
        hit: query('#firstText'),
      });
      expect(tooltipAt({ x: 50, y: 75 })).toEqual({
        tooltip: query('#second'),
        hit: query('#secondText'),
      });
      expect(tooltipAt({ x: 50, y: 125 })).toEqual({
        tooltip: query('#second'),
        hit: query('#second'),
      });
      expect(tooltipAt({ x: 250, y: 250 })).toBeNull();

      expect(triggerOf(query('#second'))).toBe(query('#target'));
      expect(triggerOf(query('#first'))).toBeNull();
      expect(triggerOf(query('[role="tooltip"]:not([id])'))).toBeNull();
    });

    it('anchors a tooltip, mounted anew in a portal each time it shows, by its text among the tooltips', () => {
      renderPage(`
        <button id="save" aria-describedby="i5f3a2b1c-7d8e-4f9a-b0c1-d2e3f4a5b6c7">Save</button>
        <div data-euiportal="true">
          <div id="i5f3a2b1c-7d8e-4f9a-b0c1-d2e3f4a5b6c7" role="tooltip" data-rect="0,0,100,40"><div>Saves the rule</div></div>
        </div>
      `);
      const anchor = buildAnchor(query('[role="tooltip"]'));
      expect(anchor.locators[0]).toEqual({
        type: 'text',
        tag: '[role="tooltip"]',
        value: 'Saves the rule',
      });
      expect(resolveAnchor(anchor)).toEqual({ element: query('[role="tooltip"]'), exact: true });
    });

    it('does not take another tooltip for the one anchored: at its path with other text, or the hint on one of the layer’s own buttons', () => {
      renderPage(`
        <button id="save" aria-describedby="i5f3a2b1c-7d8e-4f9a-b0c1-d2e3f4a5b6c7">Save</button>
        <div data-euiportal="true">
          <div id="i5f3a2b1c-7d8e-4f9a-b0c1-d2e3f4a5b6c7" role="tooltip" data-rect="0,0,100,40">Saves the rule</div>
        </div>
      `);
      const anchor = buildAnchor(query('[role="tooltip"]'));
      const byPath = {
        ...anchor,
        locators: anchor.locators.filter(({ type }) => type === 'cssPath'),
      };
      expect(resolveAnchor(byPath)).toEqual({ element: query('[role="tooltip"]'), exact: true });

      // The tooltip is gone; the layer's, on its "back" button, is mounted at the same path.
      renderPage(`
        <button id="save">Save</button>
        <div ${IGNORE_ATTR}="true"><button id="back" aria-describedby="i9a8b7c6d-5e4f-4a3b-9c8d-7e6f5a4b3c2d">Back</button></div>
        <div data-euiportal="true">
          <div id="i9a8b7c6d-5e4f-4a3b-9c8d-7e6f5a4b3c2d" role="tooltip" data-rect="0,0,100,40">Back to comments</div>
        </div>
      `);
      expect(resolveAnchor(byPath)).toBeNull();
      expect(resolveAnchor(anchor)).toBeNull();

      // Even reading the same, it is not the page's.
      query('#i9a8b7c6d-5e4f-4a3b-9c8d-7e6f5a4b3c2d').textContent = 'Saves the rule';
      expect(resolveAnchor(byPath)).toBeNull();
      expect(resolveAnchor(anchor)).toBeNull();

      // Back showing on the page, the tooltip is found by its text, the layer's notwithstanding.
      document.body.append(
        Object.assign(document.createElement('div'), {
          innerHTML: `<div id="pageTip" role="tooltip" data-rect="0,50,100,40">Saves the rule</div>`,
        })
      );
      expect(resolveAnchor(anchor)).toEqual({ element: query('#pageTip'), exact: true });
    });

    it('places an anchor at its pin, exposed while the element shows there', () => {
      renderPage(`
        <button id="target" data-rect="0,0,100,100">Go</button>
        <div id="dialog" data-rect="60,0,400,400"></div>
      `);
      const anchor: ElementAnchor = {
        locators: [{ type: 'id', value: 'target' }],
        relativeX: 0.25,
        relativeY: 0.5,
      };
      const resolved = { element: query('#target'), exact: true };
      expect(placeAnchor(anchor, resolved)).toEqual({
        ...resolved,
        point: { x: 25, y: 50 },
        exposed: true,
      });
      expect(placeAnchor({ ...anchor, relativeX: 0.75 }, resolved)).toEqual({
        ...resolved,
        point: { x: 75, y: 50 },
        exposed: false,
      });
    });
  });
});
