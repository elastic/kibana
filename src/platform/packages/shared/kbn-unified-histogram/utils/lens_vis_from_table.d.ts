import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export declare const enrichLensAttributesWithTablesData: ({ attributes, table, }: {
    attributes: LensAttributes;
    table: Datatable | undefined;
}) => LensAttributes;
export declare const removeTablesFromLensAttributes: (attributes: LensAttributes) => TypedLensByValueInput;
