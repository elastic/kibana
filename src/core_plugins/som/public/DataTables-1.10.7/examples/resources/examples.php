<?php

if ( isset( $_POST['src'] ) && preg_match( '/scripts\/[a-zA-Z_\-_]+\.php/', $_POST['src'] ) !== 0 ) {
	echo htmlspecialchars( file_get_contents( '../server_side/'.$_POST['src'] ) );
}
else {
	echo '';
}


