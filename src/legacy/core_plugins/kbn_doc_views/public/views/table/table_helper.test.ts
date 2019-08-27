/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  replaceMarkWithReactDom,
  convertAngularHtml,
  arrayContainsObjects,
  formatValue,
} from './table_helper';

describe('replaceMarkWithReactDom', () => {
  it(`converts <mark>test</mark> to react nodes`, () => {
    const actual = replaceMarkWithReactDom(
      '<mark>marked1</mark> blablabla <mark>marked2</mark> end'
    );
    expect(actual).toMatchInlineSnapshot(`
                                    <React.Fragment>
                                      
                                      <span>
                                        <mark>
                                          marked1
                                        </mark>
                                         blablabla 
                                      </span>
                                      <span>
                                        <mark>
                                          marked2
                                        </mark>
                                         end
                                      </span>
                                    </React.Fragment>
                        `);
  });

  it(`doesn't convert invalid markup to react dom nodes`, () => {
    const actual = replaceMarkWithReactDom('<mark>test sdf <mark>sdf</mark>');
    expect(actual).toMatchInlineSnapshot(`
                                                <React.Fragment>
                                                  
                                                  test sdf 
                                                  <span>
                                                    <mark>
                                                      sdf
                                                    </mark>
                                                    
                                                  </span>
                                                </React.Fragment>
                                `);
  });

  it(`returns strings without markup unchanged `, () => {
    const actual = replaceMarkWithReactDom('blablabla');
    expect(actual).toMatchInlineSnapshot(`
                                                <React.Fragment>
                                                  blablabla
                                                </React.Fragment>
                                `);
  });
});

describe('convertAngularHtml', () => {
  it(`converts html for usage in angular to usage in react`, () => {
    const actual = convertAngularHtml('<span ng-non-bindable>Good morning!</span>');
    expect(actual).toMatchInlineSnapshot(`"Good morning!"`);
  });
  it(`converts html containing <mark> for usage in react`, () => {
    const actual = convertAngularHtml(
      '<span ng-non-bindable>Good <mark>morning</mark>dear <mark>reviewer</mark>!</span>'
    );
    expect(actual).toMatchInlineSnapshot(`
                        <React.Fragment>
                          Good 
                          <span>
                            <mark>
                              morning
                            </mark>
                            dear 
                          </span>
                          <span>
                            <mark>
                              reviewer
                            </mark>
                            !
                          </span>
                        </React.Fragment>
                `);
  });
});

describe('arrayContainsObjects', () => {
  it(`returns false for an array of primitives`, () => {
    const actual = arrayContainsObjects(['test', 'test']);
    expect(actual).toBeFalsy();
  });

  it(`returns true for an array of objects`, () => {
    const actual = arrayContainsObjects([{}, {}]);
    expect(actual).toBeTruthy();
  });

  it(`returns true for an array of objects and primitves`, () => {
    const actual = arrayContainsObjects([{}, 'sdf']);
    expect(actual).toBeTruthy();
  });

  it(`returns false for an array of null values`, () => {
    const actual = arrayContainsObjects([null, null]);
    expect(actual).toBeFalsy();
  });

  it(`returns false if no array is given`, () => {
    const actual = arrayContainsObjects([null, null]);
    expect(actual).toBeFalsy();
  });
});

describe('formatValue', () => {
  it(`formats an array of objects`, () => {
    const actual = formatValue([{ test: '123' }, ''], '');
    expect(actual).toMatchInlineSnapshot(`
      "{
        \\"test\\": \\"123\\"
      }
      \\"\\""
    `);
  });
  it(`formats an array of primitives`, () => {
    const actual = formatValue(['test1', 'test2'], '');
    expect(actual).toMatchInlineSnapshot(`"test1, test2"`);
  });
  it(`formats an object`, () => {
    const actual = formatValue({ test: 1 }, '');
    expect(actual).toMatchInlineSnapshot(`
      "{
        \\"test\\": 1
      }"
    `);
  });
  it(`formats an angular formatted string `, () => {
    const actual = formatValue(
      '',
      '<span ng-non-bindable>Good <mark>morning</mark>dear <mark>reviewer</mark>!</span>'
    );
    expect(actual).toMatchInlineSnapshot(`
      <React.Fragment>
        Good 
        <span>
          <mark>
            morning
          </mark>
          dear 
        </span>
        <span>
          <mark>
            reviewer
          </mark>
          !
        </span>
      </React.Fragment>
    `);
  });
});
