/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-empty-interface */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutSessionOpenChildOptions,
  EuiFlyoutSessionOpenSystemOptions,
  EuiFlyoutSessionProvider,
  EuiFlyoutSessionRenderContext,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFlyoutSession,
} from '@elastic/eui';

interface ECommerceContentProps {
  itemQuantity: number;
}
interface ShoppingCartContentProps extends ECommerceContentProps {
  onQuantityChange: (delta: number) => void;
}
interface ReviewOrderContentProps extends ECommerceContentProps {}
interface ItemDetailsContentProps extends ECommerceContentProps {}

/**
 *
 * The flyout system allows custom meta data to be provided by the consumer, in the "EuiFlyoutSessionOpen*Options"
 * interfaces. In the advanced use case, (ECommerceApp), we're using metadata within the renderMainFlyoutContent
 * function as a conditional to determine which component to render in the main flyout.
 */
interface ECommerceAppMeta {
  ecommerceMainFlyoutKey?: 'shoppingCart' | 'reviewOrder';
}

const ShoppingCartContent: React.FC<ShoppingCartContentProps> = ({
  itemQuantity,
  onQuantityChange,
}) => {
  const { openChildFlyout, openSystemFlyout, closeChildFlyout, clearHistory, isChildFlyoutOpen } =
    useEuiFlyoutSession();

  const handleOpenItemDetails = () => {
    const options: EuiFlyoutSessionOpenChildOptions<ECommerceAppMeta> = {
      title: 'Item details',
      size: 's',
      flyoutProps: {
        className: 'childFlyoutItemDetails',
        'aria-label': 'Item details',
        onClose: () => {
          console.log('Item details onClose triggered');
          closeChildFlyout(); // If we add an onClose handler to the child flyout, we have to call closeChildFlyout within it for the flyout to actually close
        },
      },
    };
    openChildFlyout(options);
  };

  const handleProceedToReview = () => {
    // const reviewFlyoutSize = config?.mainSize || 'm';
    const options: EuiFlyoutSessionOpenSystemOptions<ECommerceAppMeta> = {
      title: 'Review order',
      hideTitle: true, // title will only show in the history popover
      size: 'm',
      meta: { ecommerceMainFlyoutKey: 'reviewOrder' },
      flyoutProps: {
        type: 'push',
        pushMinBreakpoint: 'xs',
        className: 'mainFlyoutReviewOrder',
        'aria-label': 'Review order',
      },
    };
    openSystemFlyout(options);
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-shopping-cart-title">Shopping cart</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Item: Flux Capacitor</p>
        </EuiText>
        <EuiButton onClick={isChildFlyoutOpen ? closeChildFlyout : handleOpenItemDetails}>
          {isChildFlyoutOpen ? 'Close item details' : 'View item details'} (child flyout)
        </EuiButton>
        <EuiSpacer />
        <EuiText>Quantity: {itemQuantity}</EuiText>
        <EuiButton
          onClick={() => onQuantityChange(-1)}
          iconType="minusInCircle"
          aria-label="Decrease quantity"
          isDisabled={itemQuantity <= 0}
        >
          -1
        </EuiButton>{' '}
        <EuiButton
          onClick={() => onQuantityChange(1)}
          iconType="plusInCircle"
          aria-label="Increase quantity"
        >
          +1
        </EuiButton>
        <EuiSpacer />
        <EuiButton onClick={handleProceedToReview} isDisabled={itemQuantity <= 0} fill>
          Proceed to review
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={clearHistory} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

const ReviewOrderContent: React.FC<ReviewOrderContentProps> = ({ itemQuantity }) => {
  const { clearHistory } = useEuiFlyoutSession();

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-review-order-title">Review order</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Item: Flux Capacitor</p>
          <p>Quantity: {itemQuantity}</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill color="accent">
          Confirm purchase
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={clearHistory} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

const ItemDetailsContent: React.FC<ItemDetailsContentProps> = ({ itemQuantity }) => {
  const { closeChildFlyout } = useEuiFlyoutSession();

  return (
    <>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            <strong>Item:</strong> Flux Capacitor
          </p>
          <p>
            <strong>Selected quantity:</strong> {itemQuantity}
          </p>
          <p>This amazing device makes time travel possible! Handle with care.</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeChildFlyout} color="danger">
          Close details
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Component for the main control buttons and state display
const ECommerceAppControls: React.FC = () => {
  const {
    openSystemFlyout,
    goBack,
    isFlyoutOpen,
    canGoBack,
    isChildFlyoutOpen,
    closeChildFlyout,
    clearHistory,
  } = useEuiFlyoutSession();

  const handleCloseOrGoBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      clearHistory();
    }
  };
  const handleOpenShoppingCart = () => {
    const options: EuiFlyoutSessionOpenSystemOptions<ECommerceAppMeta> = {
      title: 'Shopping cart',
      hideTitle: true, // title will only show in the history popover
      size: 'm',
      meta: { ecommerceMainFlyoutKey: 'shoppingCart' },
      flyoutProps: {
        type: 'push',
        pushMinBreakpoint: 'xs',
        className: 'mainFlyoutShoppingCart',
        'aria-label': 'Shopping cart',
        onClose: (event) => {
          console.log('Shopping cart onClose triggered', event);
          clearHistory(); // If we add an onClose handler to the main flyout, we have to call clearHistory within it for the flyout to actually close
        },
      },
    };
    openSystemFlyout(options);
  };

  return (
    <>
      <EuiButton onClick={handleOpenShoppingCart} isDisabled={isFlyoutOpen} fill>
        Open shopping cart
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={closeChildFlyout} isDisabled={!isChildFlyoutOpen} color="warning">
        Close child flyout
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={handleCloseOrGoBack} isDisabled={!isFlyoutOpen} color="warning">
        Close/Go back
      </EuiButton>
    </>
  );
};

export const ECommerceApp: React.FC = () => {
  const [itemQuantity, setItemQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    setItemQuantity((prev) => Math.max(0, prev + delta));
  };

  // Render function for MAIN flyout content
  const renderMainFlyoutContent = (context: EuiFlyoutSessionRenderContext<ECommerceAppMeta>) => {
    const { meta } = context;
    const { ecommerceMainFlyoutKey } = meta || {};

    if (ecommerceMainFlyoutKey === 'shoppingCart') {
      return (
        <ShoppingCartContent itemQuantity={itemQuantity} onQuantityChange={handleQuantityChange} />
      );
    }
    if (ecommerceMainFlyoutKey === 'reviewOrder') {
      return <ReviewOrderContent itemQuantity={itemQuantity} />;
    }

    console.warn('renderMainFlyoutContent: Unknown flyout key', meta);
    return null;
  };

  // Render function for CHILD flyout content
  const renderChildFlyoutContent = () => {
    return <ItemDetailsContent itemQuantity={itemQuantity} />;
  };

  return (
    <>
      <EuiText>
        <p>
          This demo shows how to use the <code>openSystemFlyout</code> function to open a flyout
          that systematically handles top menu bars for parent and child flyouts.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderMainFlyoutContent}
        renderChildFlyoutContent={renderChildFlyoutContent}
        onUnmount={() => console.log('System flyouts have been unmounted')}
      >
        <ECommerceAppControls />
      </EuiFlyoutSessionProvider>
    </>
  );
};
