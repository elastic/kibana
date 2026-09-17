/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildAnchor,
  buildCssPath,
  getAnchorPoint,
  looksGenerated,
  promoteToAnnotatable,
  resolveAnchor,
} from './anchor';

// jsdom has no layout: elements get a box from `data-rect="x,y,width,height"` (default 10,10,100,20).
const rectOf = (element: Element): DOMRect => {
  const [x, y, width, height] = (element.getAttribute('data-rect') ?? '10,10,100,20')
    .split(',')
    .map(Number);
  return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height } as DOMRect;
};

const render = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(...Array.from(parsed.body.childNodes));
};

const query = (selector: string): Element => {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

const bySubj = (subj: string): Element => query(`[data-test-subj="${subj}"]`);

describe('anchor', () => {
  beforeAll(() => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect(this: Element) {
        return rectOf(this);
      });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('flags generated ids', () => {
    expect(looksGenerated('generated-id-1a2b3c4d-5e6f')).toBe(true);
    expect(looksGenerated('i1234abcd')).toBe(true);
    expect(looksGenerated('EuiPageTemplateInner:r67:')).toBe(true);
    expect(looksGenerated('EuiPageTemplateInner«r67»')).toBe(true);
    expect(looksGenerated('saveButton')).toBe(false);
    expect(looksGenerated('step-2')).toBe(false);
  });

  it('promotes content to the nearest semantic element', () => {
    render(`<button data-test-subj="save"><span><svg><path></path></svg></span></button>`);

    expect(promoteToAnnotatable(query('path'))).toBe(query('svg'));
    expect(promoteToAnnotatable(query('span'))).toBe(bySubj('save'));
  });

  it('collects every locator that identifies the element uniquely, most stable first', () => {
    render(`
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
    render(`
      <div data-test-subj="rowA"><button data-test-subj="delete">Delete</button></div>
      <div data-test-subj="rowB"><button data-test-subj="delete">Delete</button></div>
    `);

    const { locators } = buildAnchor(query('[data-test-subj="rowB"] button'));

    expect(locators[0]).toEqual({ type: 'testSubj', path: 'rowB > delete' });
    expect(locators.some((locator) => locator.type === 'text')).toBe(false);
  });

  it('skips generated ids and falls back to a structural path with a fingerprint', () => {
    render(`
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
    render(`<div data-test-subj="table"><div><p>a</p><p>b</p></div></div>`);
    const element = document.querySelectorAll('p')[1];

    expect(buildCssPath(element)).toBe('[data-test-subj="table"] > div > p:nth-of-type(2)');
    expect(buildCssPath(element, bySubj('table'))).toBe('div > p:nth-of-type(2)');
  });

  it('does not start structural paths from an ancestor that is repeated in the document', () => {
    render(`
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
    render(`<button aria-label="${'x'.repeat(300)}">Go</button>`);

    const { locators } = buildAnchor(query('button'));

    expect(locators.some((locator) => locator.type === 'ariaLabel')).toBe(false);
    expect(locators.some((locator) => locator.type === 'text')).toBe(true);
  });

  it('resolves the first locator matching exactly one visible element', () => {
    render(`
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
    render(`<div id="panel"><span>Something else</span></div>`);

    const resolved = resolveAnchor({
      locators: [{ type: 'cssPath', selector: '[id="panel"] > span', fingerprint: 'span|Ready' }],
      relativeX: 0.5,
      relativeY: 0.5,
    });

    expect(resolved?.element).toBe(query('span'));
    expect(resolved?.exact).toBe(false);
  });

  it('treats a structural path matching several elements as a miss', () => {
    render(`
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
      render(chart);

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
      render(chart);
      const anchor = anchorBar();

      render(
        chart.replace('500,150,20,150', '300,150,20,150').replace('0,0,1000,300', '0,0,600,300')
      );
      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 310, y: 225 });

      render(`<svg data-test-subj="chart" data-rect="0,0,1000,300"></svg>`);
      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 510, y: 225 });
    });

    it('falls back to the proportional position when the target at the path has other content', () => {
      render(chart);
      const anchor = anchorBar();

      // The moved rect would put the pin at x=310 if it were still trusted.
      render(
        chart.replace(
          '<rect data-test-subj="bar" data-rect="500,150,20,150"></rect>',
          '<rect data-rect="300,150,20,150"><title>Changed</title></rect>'
        )
      );

      expect(getAnchorPoint(anchor, bySubj('chart'))).toEqual({ x: 510, y: 225 });
    });
  });
});
