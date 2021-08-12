/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import React from 'react';
// import {
//   AnimateLayoutChanges,
//   defaultAnimateLayoutChanges,
//   rectSortingStrategy,
// } from '@dnd-kit/sortable';
// import { Sortable, Props as SortableProps } from './sortable';

// import styles from './grid_container.module.css';

// const props: Partial<SortableProps> = {
//   adjustScale: true,
//   Container: (containerProps: any) => <GridContainer {...props} columns={5} />,
//   strategy: rectSortingStrategy,
//   wrapperStyle: () => ({
//     width: '100%',
//     height: 140,
//   }),
// };

// export const BasicSetup = () => <Sortable {...props} />;

// export interface Props {
//   children: React.ReactNode;
//   columns: number;
// }

// export function GridContainer({ children, columns }: Props) {
//   return (
//     <ul
//       className={styles.GridContainer}
//       style={
//         {
//           '--col-count': columns,
//         } as React.CSSProperties
//       }
//     >
//       {children}
//     </ul>
//   );
// }
