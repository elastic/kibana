/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../../common/test_helpers/function_wrapper';
import { elasticOutline } from '../../common/lib/elastic_outline';
import { elasticLogo } from '../../common/lib/elastic_logo';
import { getFunctionErrors } from '../../common/i18n';
import { revealImageFunction } from './reveal_image_function';
import { Origin } from '../../common/types/expression_functions';
import { ExecutionContext } from 'src/plugins/expressions';

const errors = getFunctionErrors().revealImage;

describe('revealImageFunction', () => {
  const fn = functionWrapper(revealImageFunction);

  it('returns a render as revealImage', () => {
    const result = fn(
      0.5,
      {
        image: null,
        emptyImage: null,
        origin: Origin.BOTTOM,
      },
      {} as ExecutionContext
    );
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'revealImage');
  });

  describe('context', () => {
    it('throws when context is not a number between 0 and 1', () => {
      expect(() => {
        fn(
          10,
          {
            image: elasticLogo,
            emptyImage: elasticOutline,
            origin: Origin.TOP,
          },
          {} as ExecutionContext
        );
      }).toThrow(new RegExp(errors.invalidPercent(10).message));

      expect(() => {
        fn(
          -0.1,
          {
            image: elasticLogo,
            emptyImage: elasticOutline,
            origin: Origin.TOP,
          },
          {} as ExecutionContext
        );
      }).toThrow(new RegExp(errors.invalidPercent(-0.1).message));
    });
  });

  describe('args', () => {
    describe('image', () => {
      it('sets the image', () => {
        const result = fn(
          0.89,
          {
            emptyImage: null,
            origin: Origin.TOP,
            image: elasticLogo,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('image', elasticLogo);
      });

      it('defaults to the Elastic outline logo', () => {
        const result = fn(
          0.89,
          {
            emptyImage: null,
            origin: Origin.TOP,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('image', elasticOutline);
      });
    });

    describe('emptyImage', () => {
      it('sets the background image', () => {
        const result = fn(
          0,
          {
            emptyImage: elasticLogo,
            origin: Origin.TOP,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('emptyImage', elasticLogo);
      });

      it('sets emptyImage to null', () => {
        const result = fn(
          0,
          {
            emptyImage: null,
            origin: Origin.TOP,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('emptyImage', null);
      });
    });

    describe('origin', () => {
      it('sets which side to start the reveal from', () => {
        let result = fn(
          1,
          {
            emptyImage: null,
            origin: Origin.TOP,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('origin', 'top');
        result = fn(
          1,
          {
            emptyImage: null,
            origin: Origin.LEFT,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('origin', 'left');
        result = fn(
          1,
          {
            emptyImage: null,
            origin: Origin.BOTTOM,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('origin', 'bottom');
        result = fn(
          1,
          {
            emptyImage: null,
            origin: Origin.RIGHT,
            image: null,
          },
          {} as ExecutionContext
        ).value;
        expect(result).toHaveProperty('origin', 'right');
      });
    });
  });
});
