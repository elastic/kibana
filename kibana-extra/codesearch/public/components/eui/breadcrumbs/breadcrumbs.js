import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { EuiLink } from '@elastic/eui';

const limitBreadcrumbs = (breadcrumbs, max) => {
  const breadcrumbsAtStart = [];
  const breadcrumbsAtEnd = [];
  const limit = Math.min(max, breadcrumbs.length);

  for (let i = 0; i < limit; i++) {
    // We'll alternate with displaying breadcrumbs at the end and at the start, but be biased
    // towards breadcrumbs the end so that if max is an odd number, we'll have one more
    // breadcrumb visible at the end than at the beginning.
    const isEven = i % 2 === 0;

    // We're picking breadcrumbs from the front AND the back, so we treat each iteration as a
    // half-iteration.
    const normalizedIndex = Math.floor(i * 0.5);
    const indexOfBreadcrumb = isEven ? breadcrumbs.length - 1 - normalizedIndex : normalizedIndex;
    const breadcrumb = breadcrumbs[indexOfBreadcrumb];

    if (isEven) {
      breadcrumbsAtEnd.unshift(breadcrumb);
    } else {
      breadcrumbsAtStart.push(breadcrumb);
    }
  }

  if (max < breadcrumbs.length) {
    breadcrumbsAtStart.push(<EuiBreadcrumbCollapsed key="collapsed" />);
  }

  return [
    ...breadcrumbsAtStart,
    ...breadcrumbsAtEnd,
  ];
};

const EuiBreadcrumbCollapsed = () => (
  <Fragment>
    <div className="euiBreadcrumb euiBreadcrumb--collapsed">&#8230;</div>
    <EuiBreadcrumbSeparator />
  </Fragment>
);

const EuiBreadcrumbSeparator = () => <div className="euiBreadcrumbSeparator" />;

export const EuiBreadcrumbs = ({
                                 breadcrumbs,
                                 className,
                                 responsive,
                                 truncate,
                                 max,
                                 ...rest,
                               }) => {
  const breadcrumbElements = breadcrumbs.map((breadcrumb, index) => {
    const {
      text,
      href,
      onClick,
      className: breadcrumbClassName,
      ...breadcrumbRest
    } = breadcrumb;

    const isLastBreadcrumb = index === breadcrumbs.length - 1;

    const breadcrumbClasses = classNames('euiBreadcrumb', breadcrumbClassName, {
      'euiBreadcrumb--last': isLastBreadcrumb,
    });

    let link;
    if(breadcrumb.component)  {
      link = breadcrumb.component;
    } else {
      if (isLastBreadcrumb) {
        link = (
          <span
            className={breadcrumbClasses}
            title={truncate ? text : undefined}
            aria-current="page"
            {...breadcrumbRest}
          >
          {text}
        </span>
        );
      } else {
        link = (
          <EuiLink
            color="subdued"
            href={href}
            onClick={onClick}
            className={breadcrumbClasses}
            title={truncate ? text : undefined}
            {...breadcrumbRest}
          >
            {text}
          </EuiLink>
        );
      }
    }

    let separator;

    if (!isLastBreadcrumb) {
      separator = <EuiBreadcrumbSeparator />;
    }

    return (
      <Fragment key={index}>
        {link}
        {separator}
      </Fragment>
    );
  });

  const limitedBreadcrumbs = max ? limitBreadcrumbs(breadcrumbElements, max) : breadcrumbElements;

  const classes = classNames('euiBreadcrumbs', className, {
    'euiBreadcrumbs--truncate': truncate,
    'euiBreadcrumbs--responsive': responsive,
  });

  return (
    <nav aria-label="breadcrumb" className={classes} {...rest}>
      {limitedBreadcrumbs}
    </nav>
  );
};

EuiBreadcrumbs.propTypes = {
  className: PropTypes.string,
  responsive: PropTypes.bool,
  truncate: PropTypes.bool,
  max: PropTypes.number,
  breadcrumbs: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.node.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
  })).isRequired,
};

EuiBreadcrumbs.defaultProps = {
  responsive: true,
  truncate: true,
  max: 5,
};