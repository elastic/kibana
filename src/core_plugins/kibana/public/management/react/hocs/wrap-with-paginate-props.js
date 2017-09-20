import React, { cloneElement } from 'react';
import { chunk, get } from 'lodash';
import { set } from 'object-path-immutable';

export const wrapWithPaginateProps = ({ defaults, getState, setState}) => {
  return (BaseComponent) => (props) => {
    const {
      page = defaults.page || 0,
      perPage = defaults.perPage || 10,
    } = getState();

    const paginateProps = {
      page,
      perPage,
      goToPage: page => setState(page, perPage),
      changePerPage: perPage => setState(0, perPage),
    };

    return <BaseComponent {...props} {...paginateProps}/>
  }
};

// const PaginateWrap2 = (props) => {
//   const {
//     children,
//     itemsPath,
//     selectorPath,
//     action,
//     defaultPerPage,
//     defaultPage,
//     ...rest,
//   } = props;

//   const perPage = get(props, `${selectorPath}.perPage`, defaultPerPage);
//   const page = get(props, `${selectorPath}.page`, defaultPage);

//   // console.log('PaginateWrap', props, perPage, page, get(props, selectorPath));

//   let items = Array.from(get(props, itemsPath, []));
//   if (items.length === 0) {
//     return cloneElement(children, rest);
//   }

//   const numOfPages = Math.ceil(items.length / perPage);
//   const pages = chunk(items, perPage);
//   items = pages[page] || [];

//   // console.log('PaginateWrap more', numOfPages, pages, perPage, page);

//   const propsWithoutItems = {
//     ...rest,
//     page,
//     perPage,
//     numOfPages,
//     goToPage: page => action(selectorPath, { page, perPage }),
//     changePerPage: perPage => action(selectorPath, { perPage, page: 0 }),
//   };

//   const propsToChild = set(propsWithoutItems, itemsPath, items);

//   return cloneElement(children, propsToChild);
// };

// export const wrapWithPaginateProps2 = ({ perPage, page, selectorPath, itemsPath, action}) => {
//   return (BaseComponent) => (props) => (
//     <PaginateWrap
//       defaultPerPage={perPage}
//       defaultPage={page}
//       selectorPath={selectorPath}
//       itemsPath={itemsPath}
//       action={action}
//       {...props}
//     >
//       <BaseComponent/>
//     </PaginateWrap>
//   );
// };
