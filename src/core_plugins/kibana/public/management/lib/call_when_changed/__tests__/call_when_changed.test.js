import { callWhenChanged } from '../';

describe('callWhenChanged', () => {
  describe('should change', () => {
    test('when all parameters change', () => {
      let one = 0;
      let two = 0;

      const fetcher = callWhenChanged(
        [() => one, () => two],
        (one, two) => {
          return one + two;
        }
      );

      expect(fetcher()).toEqual(0);
      one = 1;
      two = 2;
      expect(fetcher()).toEqual(3);
    });

    test('when one parameter changes', () => {
      let one = 0;
      const two = 0;

      const fetcher = callWhenChanged(
        [() => one, () => two],
        (one, two) => {
          return one + two;
        }
      );

      expect(fetcher()).toEqual(0);
      one = 1;
      expect(fetcher()).toEqual(1);
    });

    test('when using other primitives', () => {
      const one = null;
      const two = 'two';
      let three = [1, 2];
      const four = () => {};

      const fetcher = callWhenChanged(
        [() => one, () => two, () => three, () => four],
        (one, two, three, four) => ([one, two, three, four])
      );

      expect(fetcher()).toEqual([one, two, three, four]);
      three = [3, 4];
      expect(fetcher()).toEqual([one, two, three, four]);
    });
  });

  describe('should not change', () => {
    test('when no parameters change', () => {
      let one = 0;
      let two = 0;

      const fetcher = callWhenChanged(
        [() => one, () => two],
        (one, two) => {
          return one + two;
        }
      );

      expect(fetcher()).toEqual(0);
      expect(fetcher()).toEqual(0);
      one = 1;
      two = 2;
      expect(fetcher()).toEqual(3);
      expect(fetcher()).toEqual(3);
    });

    test('when a deep change occurs', () => {
      const one = [1, 2];
      const two = [2];

      const fetcher = callWhenChanged(
        [() => one, () => two],
        (one, two) => {
          return one.concat(two);
        }
      );

      expect(fetcher()).toEqual([1, 2, 2]);
      two[0] = 3;
      // This should not change because `two === two` is true
      expect(fetcher()).toEqual([1, 2, 2]);
    });
  });
});
