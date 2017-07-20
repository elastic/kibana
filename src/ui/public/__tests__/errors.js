import expect from 'expect.js';
import {
  SearchTimeout,
  RequestFailure,
  FetchFailure,
  ShardFailure,
  VersionConflict,
  MappingConflict,
  RestrictedMapping,
  CacheWriteFailure,
  FieldNotFoundInCache,
  DuplicateField,
  SavedObjectNotFound,
  IndexPatternMissingIndices,
  NoDefinedIndexPatterns,
  NoDefaultIndexPattern,
  PersistedStateError,
  VislibError,
  ContainerTooSmall,
  InvalidWiggleSelection,
  PieContainsAllZeros,
  InvalidLogScaleValues,
  StackedBarChartConfig,
  NoResults,
  KbnError
} from 'ui/errors';

describe('ui/errors', () => {
  const errors = [
    new SearchTimeout(),
    new RequestFailure('an error', { }),
    new FetchFailure({ }),
    new ShardFailure({ '_shards' : 5 }),
    new VersionConflict({ }),
    new MappingConflict({ }),
    new RestrictedMapping('field', 'indexPattern'),
    new CacheWriteFailure(),
    new FieldNotFoundInCache('aname'),
    new DuplicateField('dupfield'),
    new SavedObjectNotFound('dashboard', '123'),
    new IndexPatternMissingIndices(),
    new NoDefinedIndexPatterns(),
    new NoDefaultIndexPattern(),
    new PersistedStateError(),
    new VislibError('err'),
    new ContainerTooSmall(),
    new InvalidWiggleSelection(),
    new PieContainsAllZeros(),
    new InvalidLogScaleValues(),
    new StackedBarChartConfig('err'),
    new NoResults()
  ];

  errors.forEach(error => {
    const className = error.constructor.name;
    it(`${className} has a message`, () => {
      expect(error.message).to.not.be.empty();
    });

    it(`${className} has a stack trace`, () => {
      expect(error.stack).to.not.be.empty();
    });

    it (`${className} is an instance of KbnError`, () => {
      expect(error instanceof KbnError).to.be(true);
    });
  });
});
